const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5050;
const DB_PATH = path.join(__dirname, 'database.json');

// Initialize Supabase Admin client (with service_role key to bypass RLS)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
let supabase = null;

if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('Supabase Admin client initialized successfully.');
} else {
  console.warn('Supabase credentials missing. Cloud billing sync will not work.');
}

// Initialize Stripe client
let stripeClient = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripeClient = stripe(process.env.STRIPE_SECRET_KEY);
  console.log('Stripe client initialized successfully.');
} else {
  console.warn('Stripe secret key missing. Billing routes will fail.');
}

app.use(cors());

// ==========================================
// Stripe Webhook Endpoint (MUST be before express.json() for raw body)
// ==========================================
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeClient) {
    return res.status(500).json({ error: 'Stripe client is not initialized.' });
  }

  let event;

  try {
    event = stripeClient.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`Received Stripe Webhook Event: ${event.type}`);

  try {
    if (!supabase) {
      throw new Error('Supabase client is not initialized.');
    }

    // Handle checkout session completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata.userId;
      const stripeCustomerId = session.customer;
      const stripeSubscriptionId = session.subscription;

      if (userId) {
        const { error } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'pro',
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (error) throw error;
        console.log(`User profile ${userId} updated to PRO tier.`);
      }
    }

    // Handle subscription cancellation or modifications
    if (
      event.type === 'customer.subscription.deleted' ||
      event.type === 'customer.subscription.updated'
    ) {
      const subscription = event.data.object;
      const stripeCustomerId = subscription.customer;
      const stripeSubscriptionId = subscription.id;
      const status = subscription.status; // e.g. 'active', 'canceled', 'unpaid'

      // Check if subscription status is active
      const newTier = status === 'active' ? 'pro' : 'free';

      const { data: profile, error: selectError } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', stripeCustomerId)
        .single();

      if (selectError) throw selectError;

      if (profile) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            subscription_status: newTier,
            stripe_subscription_id: stripeSubscriptionId,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);

        if (updateError) throw updateError;
        console.log(`User profile ${profile.id} status synced to: ${newTier} (${status})`);
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Error handling webhook event:', err.message);
    res.status(500).json({ error: 'Failed to process webhook event.' });
  }
});

// ==========================================
// Standard Middleware for JSON routes
// ==========================================
app.use(express.json());

// ==========================================
// Stripe SaaS Billing Routes
// ==========================================

// Create checkout session
app.post('/api/billing/create-checkout-session', async (req, res) => {
  const { userId, email } = req.body;

  if (!userId || !email) {
    return res.status(400).json({ message: 'Missing userId or email in request.' });
  }

  if (!stripeClient) {
    return res.status(500).json({ message: 'Stripe client is not initialized.' });
  }

  try {
    // 1. Check if profile already has a Stripe customer ID
    let stripeCustomerId = null;
    if (supabase) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();

      if (profile?.stripe_customer_id) {
        stripeCustomerId = profile.stripe_customer_id;
      }
    }

    // 2. If not, check Stripe or create Stripe customer
    if (!stripeCustomerId) {
      const customers = await stripeClient.customers.list({ email: email.trim(), limit: 1 });
      if (customers.data.length > 0) {
        stripeCustomerId = customers.data[0].id;
      } else {
        const newCustomer = await stripeClient.customers.create({
          email: email.trim(),
          metadata: { userId }
        });
        stripeCustomerId = newCustomer.id;
      }

      // Update customer ID in profile database
      if (supabase) {
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', userId);
      }
    }

    // 3. Create Checkout Session
    const session = await stripeClient.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/?success=true`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/?canceled=true`,
      metadata: { userId },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Failed to create stripe checkout session:', err);
    res.status(500).json({ message: 'Internal server error while initializing checkout.' });
  }
});

// Create Stripe Customer Portal session (for cancelling/billing edits)
app.post('/api/billing/create-portal-session', async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'Missing userId parameter.' });
  }

  if (!stripeClient || !supabase) {
    return res.status(500).json({ message: 'Stripe or Supabase service not initialized.' });
  }

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!profile || !profile.stripe_customer_id) {
      return res.status(400).json({ message: 'No Stripe Customer ID found for this user.' });
    }

    const session = await stripeClient.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Failed to create customer portal session:', err);
    res.status(500).json({ message: 'Internal server error while initializing portal.' });
  }
});

// ==========================================
// Existing JSON database routes (Legacy/Local fallback)
// ==========================================

function initDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2), 'utf8');
  }
}

function readProjects() {
  initDatabase();
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database file:', error);
    return [];
  }
}

function writeProjects(projects) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(projects, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing database file:', error);
    return false;
  }
}

// GET: Retrieve all projects
app.get('/api/projects', (req, res) => {
  const projects = readProjects();
  res.json(projects);
});

// GET: Retrieve a specific project by id
app.get('/api/projects/:id', (req, res) => {
  const projects = readProjects();
  const project = projects.find(p => p.id === req.params.id);
  if (project) {
    res.json(project);
  } else {
    res.status(404).json({ message: 'Project not found' });
  }
});

// POST: Save or update a project
app.post('/api/projects', (req, res) => {
  const newProject = req.body;
  
  if (!newProject.id || !newProject.name) {
    return res.status(400).json({ message: 'Invalid project data. Missing id or name.' });
  }

  const projects = readProjects();
  const existingIndex = projects.findIndex(p => p.id === newProject.id);

  if (existingIndex !== -1) {
    projects[existingIndex] = {
      ...projects[existingIndex],
      ...newProject,
      date: new Date().toISOString()
    };
  } else {
    projects.push({
      ...newProject,
      date: new Date().toISOString()
    });
  }

  if (writeProjects(projects)) {
    res.status(200).json(newProject);
  } else {
    res.status(500).json({ message: 'Failed to save project.' });
  }
});

// DELETE: Delete a project
app.delete('/api/projects/:id', (req, res) => {
  const projects = readProjects();
  const updatedProjects = projects.filter(p => p.id !== req.params.id);

  if (projects.length === updatedProjects.length) {
    return res.status(404).json({ message: 'Project not found.' });
  }

  if (writeProjects(updatedProjects)) {
    res.json({ message: 'Project deleted successfully.', id: req.params.id });
  } else {
    res.status(500).json({ message: 'Failed to delete project.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`TileVision Pro Server running on port ${PORT}`);
});

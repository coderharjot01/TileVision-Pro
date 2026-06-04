const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5050;
const DB_PATH = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json());

// Initialize database file if it doesn't exist
function initDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2), 'utf8');
  }
}

// Read projects helper
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

// Write projects helper
function writeProjects(projects) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(projects, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing database file:', error);
    return false;
  }
}

// API Routes

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
    // Update existing project
    projects[existingIndex] = {
      ...projects[existingIndex],
      ...newProject,
      date: new Date().toISOString()
    };
  } else {
    // Add new project
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

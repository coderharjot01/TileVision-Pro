import React, { useState, useEffect } from 'react';
import { Save, FolderOpen, Trash2, Calendar, FileText, CheckCircle, Database, Cloud, AlertCircle } from 'lucide-react';
import { Project } from '../utils/types';
import { supabase } from '../utils/supabaseClient';

interface ProjectListProps {
  currentProject: Project;
  onLoadProject: (project: Project) => void;
  onSaveTrigger: () => void;
  user: any;
  subscriptionStatus: 'free' | 'pro';
  onOpenPricing: () => void;
}

export default function ProjectList({
  currentProject,
  onLoadProject,
  onSaveTrigger,
  user,
  subscriptionStatus,
  onOpenPricing
}: ProjectListProps) {
  const [savedProjects, setSavedProjects] = useState<Project[]>([]);
  const [saveName, setSaveName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [limitError, setLimitError] = useState<string | null>(null);

  const isPro = subscriptionStatus === 'pro';

  // Fetch projects
  const fetchProjects = async () => {
    setLimitError(null);
    if (user) {
      // Fetch from Supabase
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('date', { ascending: false });

        if (error) throw error;

        const mapped: Project[] = (data || []).map((row: any) => ({
          ...row.data,
          id: row.id,
          name: row.name,
          date: row.date
        }));
        setSavedProjects(mapped);
      } catch (err) {
        console.error('Error fetching Supabase projects:', err);
        // Fallback to local storage on error
        loadFromLocalStorage();
      }
    } else {
      // Fetch from LocalStorage for guest
      loadFromLocalStorage();
    }
  };

  const loadFromLocalStorage = () => {
    const local = localStorage.getItem('tilevision_projects');
    if (local) {
      setSavedProjects(JSON.parse(local));
    } else {
      setSavedProjects([]);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  // Save current project state
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) return;

    setLimitError(null);
    setIsSaving(true);

    const projectToSave: Project = {
      ...currentProject,
      name: saveName.trim(),
      date: new Date().toISOString()
    };

    // Limit check for Free/Guest tiers
    const isNewProject = !savedProjects.some(p => p.id === currentProject.id);
    if (isNewProject && !isPro && savedProjects.length >= 3) {
      setLimitError('You have reached the 3-project limit on the Free tier. Upgrade to Pro for unlimited saves!');
      setIsSaving(false);
      onOpenPricing();
      return;
    }

    try {
      if (user) {
        // Save to Supabase
        const { error } = await supabase
          .from('projects')
          .upsert({
            id: projectToSave.id,
            user_id: user.id,
            name: projectToSave.name,
            data: projectToSave,
            date: projectToSave.date
          });

        if (error) throw error;
      } else {
        // Save to local storage
        saveToLocalStorage(projectToSave);
      }

      setSaveSuccess(true);
      setSaveName('');
      fetchProjects();
      onSaveTrigger();
    } catch (err: any) {
      console.error('Failed to save project:', err);
      setLimitError(err.message || 'Error occurred while saving to the cloud database.');
    } finally {
      setTimeout(() => {
        setSaveSuccess(false);
        setIsSaving(false);
      }, 2000);
    }
  };

  const saveToLocalStorage = (proj: Project) => {
    const local = localStorage.getItem('tilevision_projects');
    let list: Project[] = local ? JSON.parse(local) : [];

    const existingIdx = list.findIndex(p => p.id === proj.id);
    if (existingIdx !== -1) {
      list[existingIdx] = proj;
    } else {
      list.push(proj);
    }

    localStorage.setItem('tilevision_projects', JSON.stringify(list));
  };

  // Delete project
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLimitError(null);

    try {
      if (user) {
        // Delete from Supabase
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', id);

        if (error) throw error;
      } else {
        // Delete from LocalStorage
        const local = localStorage.getItem('tilevision_projects');
        if (local) {
          const list: Project[] = JSON.parse(local);
          const filtered = list.filter(p => p.id !== id);
          localStorage.setItem('tilevision_projects', JSON.stringify(filtered));
        }
      }
      fetchProjects();
      onSaveTrigger();
    } catch (err) {
      console.error('Failed to delete project:', err);
      alert('Error deleting project. Please try again.');
    }
  };

  // Format date helper
  const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  return (
    <div className="glass-panel-light rounded-3xl p-6 border border-white/60 shadow-xl space-y-6">

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold text-luxury-charcoal font-display">5. Saved Designs</h2>
          <p className="text-xs text-gray-500">Save your blueprints and layout configurations</p>
        </div>

        {/* Database indicator */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
          user
            ? 'bg-green-150 text-green-800 border border-green-200/50'
            : 'bg-amber-100 text-amber-700 border border-amber-250/50'
        }`}>
          {user ? <Cloud className="w-3.5 h-3.5 text-green-700" /> : <Database className="w-3.5 h-3.5 text-amber-600" />}
          <span>{user ? `Cloud Database (${isPro ? 'Pro' : 'Free'})` : 'Local Guest Storage'}</span>
        </div>
      </div>

      {/* Error alert */}
      {limitError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2.5 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <span>{limitError}</span>
            {!isPro && (
              <button
                type="button"
                onClick={onOpenPricing}
                className="block mt-1 font-bold underline cursor-pointer"
              >
                Upgrade to Pro Plan
              </button>
            )}
          </div>
        </div>
      )}

      {/* Save Project Form */}
      <form onSubmit={handleSave} className="space-y-2.5">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
          Save Current Blueprint
        </label>

        <div className="flex gap-2">
          <input
            type="text"
            required
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Project Name (e.g. Foyer Entrance)"
            className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none font-semibold text-xs text-luxury-charcoal focus:border-luxury-gold transition duration-300"
          />

          <button
            type="submit"
            disabled={isSaving}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer transition-all duration-300 flex items-center gap-1.5 ${
              saveSuccess
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-luxury-charcoal text-white hover:bg-luxury-gold hover:text-luxury-charcoal border-luxury-charcoal'
            }`}
          >
            {saveSuccess ? (
              <>
                <CheckCircle className="w-4 h-4" /> Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Design
              </>
            )}
          </button>
        </div>
      </form>

      {/* Saved Projects list */}
      <div className="space-y-2">
        <h3 className="block text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-2">
          Saved Projects ({savedProjects.length} {!isPro && '/ 3 Limit'})
        </h3>

        {savedProjects.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-400 border border-dashed border-gray-200 rounded-2xl flex flex-col items-center gap-1">
            <FolderOpen className="w-5 h-5 text-gray-300 stroke-1" />
            <span>No saved designs found. Save your current layout above.</span>
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {savedProjects.map((proj) => {
              const active = proj.id === currentProject.id;

              return (
                <div
                  key={proj.id}
                  onClick={() => onLoadProject(proj)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-300 flex justify-between items-center ${
                    active
                      ? 'bg-luxury-charcoal/5 border-luxury-charcoal text-luxury-charcoal'
                      : 'bg-white border-gray-150 text-gray-700 hover:border-luxury-gold hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileText className={`w-4 h-4 ${active ? 'text-luxury-gold' : 'text-gray-400'}`} />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">{proj.name}</h4>
                      <p className="text-[9px] text-gray-400 mt-0.5 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" /> {formatDate(proj.date)}
                        <span>•</span>
                        <span>{proj.rooms?.length || 1} Rooms</span>
                        <span>•</span>
                        <span>{proj.tileWidth}x{proj.tileHeight}mm</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDelete(proj.id, e)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition cursor-pointer"
                    title="Delete Saved Project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

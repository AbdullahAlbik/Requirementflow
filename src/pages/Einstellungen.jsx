import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/context/WorkspaceContext';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Settings, Save, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function Einstellungen() {
  const { activeWorkspace, loadWorkspaces } = useWorkspace();
  const [form, setForm] = useState({ name: '', description: '', mode: 'projekt', status: 'aktiv', project_goals: '', milestones: '', vision: '', releases: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeWorkspace) {
      setForm({
        name: activeWorkspace.name || '',
        description: activeWorkspace.description || '',
        mode: activeWorkspace.mode || 'projekt',
        status: activeWorkspace.status || 'aktiv',
        project_goals: activeWorkspace.project_goals || '',
        milestones: activeWorkspace.milestones || '',
        vision: activeWorkspace.vision || '',
        releases: activeWorkspace.releases || '',
      });
    }
  }, [activeWorkspace]);

  const handleSave = async () => {
    if (!activeWorkspace) return;
    setSaving(true);
    await base44.entities.Workspace.update(activeWorkspace.id, form);
    await loadWorkspaces();
    toast.success('Einstellungen gespeichert');
    setSaving(false);
  };

  if (!activeWorkspace) return <div className="p-6 text-gray-400">Bitte Workspace auswählen.</div>;

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader title="Workspace-Einstellungen" subtitle={activeWorkspace.key} />

      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2"><Settings className="w-4 h-4" />Allgemein</h3>
          <div className="space-y-3">
            <div><Label className="text-xs">Workspace-Name *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Modus</Label>
                <Select value={form.mode} onValueChange={v => setForm({...form, mode: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="projekt">Projekt</SelectItem>
                    <SelectItem value="produkt">Produkt</SelectItem>
                  </SelectContent>
                </Select></div>
              <div><Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aktiv">Aktiv</SelectItem>
                    <SelectItem value="archiviert">Archiviert</SelectItem>
                  </SelectContent>
                </Select></div>
            </div>
            <div><Label className="text-xs">Beschreibung</Label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="mt-1 h-16" /></div>
          </div>
        </div>

        <hr className="border-gray-100" />

        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            {form.mode === 'projekt' ? 'Projektziele & Meilensteine' : 'Produkt-Vision & Releases'}
          </h3>
          <div className="space-y-3">
            {form.mode === 'projekt' ? (
              <>
                <div><Label className="text-xs">Projektziele</Label>
                  <Textarea value={form.project_goals} onChange={e => setForm({...form, project_goals: e.target.value})} className="mt-1 h-20" /></div>
                <div><Label className="text-xs">Meilensteine</Label>
                  <Textarea value={form.milestones} onChange={e => setForm({...form, milestones: e.target.value})} className="mt-1 h-16" /></div>
              </>
            ) : (
              <>
                <div><Label className="text-xs">Produkt-Vision</Label>
                  <Textarea value={form.vision} onChange={e => setForm({...form, vision: e.target.value})} className="mt-1 h-20" /></div>
                <div><Label className="text-xs">Releases / Roadmap</Label>
                  <Textarea value={form.releases} onChange={e => setForm({...form, releases: e.target.value})} className="mt-1 h-16" /></div>
              </>
            )}
          </div>
        </div>

        <div className="pt-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-1" />{saving ? 'Speichern...' : 'Einstellungen speichern'}
          </Button>
        </div>
      </div>

      <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span className="text-sm font-semibold text-red-700">Gefahrenzone</span>
        </div>
        <p className="text-xs text-red-600 mb-3">Das Archivieren eines Workspace macht ihn inaktiv. Alle Daten bleiben erhalten.</p>
        <Button variant="outline" size="sm" className="border-red-300 text-red-600 hover:bg-red-50"
          onClick={async () => {
            await base44.entities.Workspace.update(activeWorkspace.id, { status: 'archiviert' });
            await loadWorkspaces();
            toast.success('Workspace archiviert');
          }}>
          Workspace archivieren
        </Button>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/context/WorkspaceContext';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, FolderOpen, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = { key: '', name: '', mode: 'projekt', description: '', owner_email: '', mandant_id: '', project_goals: '', milestones: '', vision: '', releases: '' };

export default function Workspaces() {
  const { workspaces, loadWorkspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();
  const [mandanten, setMandanten] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.auth.me().then(me => {
      setCurrentUser(me);
      // Super Admin sieht alle Mandanten, general_admin nur seinen
      if (me?.role === 'super_admin' || me?.role === 'admin') {
        base44.entities.Mandant.list('-created_date').then(setMandanten);
      } else if (me?.mandant_id) {
        base44.entities.Mandant.filter({ id: me.mandant_id }).then(setMandanten);
      }
    });
  }, []);

  const openCreate = () => {
    const defaultMandant = (currentUser?.role !== 'super_admin' && currentUser?.role !== 'admin') ? currentUser?.mandant_id || '' : '';
    setForm({ ...emptyForm, mandant_id: defaultMandant });
    setEditId(null);
    setModalOpen(true);
  };
  const openEdit = (ws) => {
    setForm({ key: ws.key, name: ws.name, mode: ws.mode, description: ws.description || '',
      owner_email: ws.owner_email || '', mandant_id: ws.mandant_id || '',
      project_goals: ws.project_goals || '',
      milestones: ws.milestones || '', vision: ws.vision || '', releases: ws.releases || '' });
    setEditId(ws.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.key || !form.name) { toast.error('Key und Name sind Pflichtfelder'); return; }
    setSaving(true);
    try {
      const data = { ...form };
      if (!data.mandant_id) delete data.mandant_id;
      if (editId) {
        await base44.entities.Workspace.update(editId, data);
        toast.success('Workspace aktualisiert');
      } else {
        await base44.entities.Workspace.create(data);
        toast.success('Workspace angelegt');
      }
      setModalOpen(false);
      loadWorkspaces();
    } catch (e) {
      toast.error('Fehler: ' + (e?.message || 'Unbekannter Fehler'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    await base44.entities.Workspace.delete(deleteId);
    toast.success('Workspace gelöscht');
    setDeleteId(null);
    loadWorkspaces();
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Workspaces"
        subtitle="Projekte und Produktbereiche verwalten"
        actions={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Neu</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workspaces.map(ws => (
          <div key={ws.id} className={`bg-white rounded-lg border p-4 hover:shadow-sm transition-shadow ${activeWorkspace?.id === ws.id ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FolderOpen className="w-4 h-4 text-blue-700" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{ws.name}</div>
                  <div className="text-xs text-gray-400 font-mono">{ws.key}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <StatusBadge value={ws.status || 'aktiv'} />
              </div>
            </div>
            <div className="text-xs text-gray-500 mb-3 line-clamp-2">{ws.description || 'Keine Beschreibung'}</div>
            <div className="flex items-center justify-between">
              <span className={`text-xs px-2 py-0.5 rounded-full ${ws.mode === 'projekt' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                {ws.mode === 'projekt' ? 'Projekt' : 'Produkt'}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setActiveWorkspace(ws)}
                  className={`p-1 rounded ${activeWorkspace?.id === ws.id ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'}`}
                  title="Aktivieren">
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button onClick={() => openEdit(ws)} className="p-1 rounded text-gray-400 hover:text-blue-600">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteId(ws.id)} className="p-1 rounded text-gray-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {workspaces.length === 0 && (
          <div className="col-span-3 text-center py-12 text-gray-400">
            <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Keine Workspaces vorhanden. Legen Sie einen an.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Workspace bearbeiten' : 'Neuer Workspace'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {mandanten.length > 0 && (
              <div>
                <Label className="text-xs">Mandant (Firma)</Label>
                <Select value={form.mandant_id} onValueChange={v => setForm({ ...form, mandant_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Mandant wählen..." /></SelectTrigger>
                  <SelectContent>
                    {mandanten.map(m => <SelectItem key={m.id} value={m.id}>{m.name} ({m.key})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Key *</Label>
                <Input value={form.key} onChange={e => setForm({...form, key: e.target.value.toUpperCase()})}
                  placeholder="z.B. PROJ1" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Modus *</Label>
                <Select value={form.mode} onValueChange={v => setForm({...form, mode: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="projekt">Projekt</SelectItem>
                    <SelectItem value="produkt">Produkt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Workspace-Name" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Beschreibung</Label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                className="mt-1 h-20" />
            </div>
            <div>
              <Label className="text-xs">Owner (E-Mail)</Label>
              <Input value={form.owner_email} onChange={e => setForm({...form, owner_email: e.target.value})}
                placeholder="owner@example.com" className="mt-1" />
            </div>
            {form.mode === 'projekt' && (
              <>
                <div>
                  <Label className="text-xs">Projektziele</Label>
                  <Textarea value={form.project_goals} onChange={e => setForm({...form, project_goals: e.target.value})}
                    className="mt-1 h-16" />
                </div>
                <div>
                  <Label className="text-xs">Meilensteine</Label>
                  <Textarea value={form.milestones} onChange={e => setForm({...form, milestones: e.target.value})}
                    className="mt-1 h-16" />
                </div>
              </>
            )}
            {form.mode === 'produkt' && (
              <>
                <div>
                  <Label className="text-xs">Vision</Label>
                  <Textarea value={form.vision} onChange={e => setForm({...form, vision: e.target.value})}
                    className="mt-1 h-16" />
                </div>
                <div>
                  <Label className="text-xs">Releases / Roadmap</Label>
                  <Textarea value={form.releases} onChange={e => setForm({...form, releases: e.target.value})}
                    className="mt-1 h-16" />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Speichern...' : 'Speichern'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Workspace löschen?</AlertDialogTitle>
            <AlertDialogDescription>Diese Aktion kann nicht rückgängig gemacht werden.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
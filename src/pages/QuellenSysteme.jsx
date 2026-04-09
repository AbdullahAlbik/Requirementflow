import React, { useEffect, useState } from 'react';
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
import { Plus, Pencil, Trash2, Search, Cpu } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = { name: '', kind: '', description: '', relevance: 'mittel', owner: '', version: '', access_info: '', notes: '' };

export default function QuellenSysteme() {
  const { activeWorkspace } = useWorkspace();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (activeWorkspace) loadData(); }, [activeWorkspace]);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.SystemSource.filter({ workspace_id: activeWorkspace.id }, '-created_date');
    setSources(data);
    setLoading(false);
  };

  const filtered = sources.filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setForm(emptyForm); setEditId(null); setModalOpen(true); };
  const openEdit = (s) => {
    setForm({ name: s.name || '', kind: s.kind || '', description: s.description || '',
      relevance: s.relevance || 'mittel', owner: s.owner || '', version: s.version || '',
      access_info: s.access_info || '', notes: s.notes || '' });
    setEditId(s.id); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Name ist Pflichtfeld'); return; }
    setSaving(true);
    const payload = { ...form, workspace_id: activeWorkspace.id };
    if (editId) { await base44.entities.SystemSource.update(editId, payload); toast.success('Systemquelle aktualisiert'); }
    else { await base44.entities.SystemSource.create(payload); toast.success('Systemquelle angelegt'); }
    setSaving(false); setModalOpen(false); loadData();
  };

  const handleDelete = async () => {
    await base44.entities.SystemSource.delete(deleteId);
    toast.success('Systemquelle gelöscht'); setDeleteId(null); loadData();
  };

  if (!activeWorkspace) return <div className="p-6 text-gray-400">Bitte Workspace auswählen.</div>;

  return (
    <div className="p-6">
      <PageHeader title="Systemquellen" subtitle={`${filtered.length} Einträge`}
        actions={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Neu</Button>} />

      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen..." className="pl-8 h-8 text-sm" />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Name</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Typ</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Version</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Relevanz</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Owner</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Lade...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">
                <Cpu className="w-8 h-8 mx-auto mb-2 opacity-30" />Keine Systemquellen gefunden
              </td></tr>
            ) : filtered.map(s => (
              <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-900">{s.name}</td>
                <td className="px-4 py-2.5 text-gray-500">{s.kind || '–'}</td>
                <td className="px-4 py-2.5 text-gray-500">{s.version || '–'}</td>
                <td className="px-4 py-2.5"><StatusBadge value={s.relevance} /></td>
                <td className="px-4 py-2.5 text-gray-500">{s.owner || '–'}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(s)} className="p-1 text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteId(s.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Systemquelle bearbeiten' : 'Neue Systemquelle'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Typ</Label>
                <Input value={form.kind} onChange={e => setForm({...form, kind: e.target.value})} className="mt-1" placeholder="z.B. ERP, CRM..." /></div>
              <div><Label className="text-xs">Version</Label>
                <Input value={form.version} onChange={e => setForm({...form, version: e.target.value})} className="mt-1" /></div>
              <div><Label className="text-xs">Relevanz</Label>
                <Select value={form.relevance} onValueChange={v => setForm({...form, relevance: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{['hoch','mittel','niedrig'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label className="text-xs">Owner</Label>
                <Input value={form.owner} onChange={e => setForm({...form, owner: e.target.value})} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Beschreibung</Label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="mt-1 h-16" /></div>
            <div><Label className="text-xs">Zugriffsinformation</Label>
              <Input value={form.access_info} onChange={e => setForm({...form, access_info: e.target.value})} className="mt-1" /></div>
            <div><Label className="text-xs">Notizen</Label>
              <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="mt-1 h-16" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Speichern...' : 'Speichern'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Systemquelle löschen?</AlertDialogTitle>
            <AlertDialogDescription>Diese Aktion kann nicht rückgängig gemacht werden.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
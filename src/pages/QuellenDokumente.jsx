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
import { Plus, Pencil, Trash2, Search, Database, AlertTriangle, Upload } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = { title: '', location: '', version: '', description: '', relevance: 'mittel', owner: '', last_reviewed_at: '', status: 'neu', notes: '' };

export default function QuellenDokumente() {
  const { activeWorkspace } = useWorkspace();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('alle');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (activeWorkspace) loadData(); }, [activeWorkspace]);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.DocumentSource.filter({ workspace_id: activeWorkspace.id }, '-created_date');
    setSources(data);
    setLoading(false);
  };

  const filtered = sources.filter(s => {
    const matchSearch = !search || s.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'alle' || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openCreate = () => { setForm(emptyForm); setEditId(null); setModalOpen(true); };
  const openEdit = (s) => {
    setForm({ title: s.title || '', location: s.location || '', version: s.version || '',
      description: s.description || '', relevance: s.relevance || 'mittel', owner: s.owner || '',
      last_reviewed_at: s.last_reviewed_at || '', status: s.status || 'neu', notes: s.notes || '' });
    setEditId(s.id); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) { toast.error('Titel ist Pflichtfeld'); return; }
    setSaving(true);
    const payload = { ...form, workspace_id: activeWorkspace.id };
    if (editId) { await base44.entities.DocumentSource.update(editId, payload); toast.success('Dokumentquelle aktualisiert'); }
    else { await base44.entities.DocumentSource.create(payload); toast.success('Dokumentquelle angelegt'); }
    setSaving(false); setModalOpen(false); loadData();
  };

  const handleDelete = async () => {
    await base44.entities.DocumentSource.delete(deleteId);
    toast.success('Dokumentquelle gelöscht'); setDeleteId(null); loadData();
  };

  const handleFileUpload = async (e, docId) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.DocumentSource.update(docId, { file_url });
    toast.success('Datei hochgeladen');
    setUploading(false);
    loadData();
  };

  if (!activeWorkspace) return <div className="p-6 text-gray-400">Bitte Workspace auswählen.</div>;

  return (
    <div className="p-6">
      <PageHeader title="Dokumentquellen" subtitle={`${filtered.length} Einträge`}
        actions={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Neu</Button>} />

      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Suchen..." className="pl-8 h-8 text-sm" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Status</SelectItem>
            {['neu','relevant','veraltet','archiviert'].map(s => <SelectItem key={s} value={s}><StatusBadge value={s} /></SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Titel</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Version</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Status</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Relevanz</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Owner</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Letzte Prüfung</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Lade...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">
                <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />Keine Dokumentquellen gefunden
              </td></tr>
            ) : filtered.map(s => (
              <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  <div className="font-medium text-gray-900">{s.title}</div>
                  {s.status === 'veraltet' && <div className="flex items-center gap-1 mt-0.5"><AlertTriangle className="w-3 h-3 text-red-500" /><span className="text-xs text-red-600">Veraltet</span></div>}
                </td>
                <td className="px-4 py-2.5 text-gray-500">{s.version || '–'}</td>
                <td className="px-4 py-2.5"><StatusBadge value={s.status} /></td>
                <td className="px-4 py-2.5"><StatusBadge value={s.relevance} /></td>
                <td className="px-4 py-2.5 text-gray-500">{s.owner || '–'}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{s.last_reviewed_at || '–'}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    <label className="cursor-pointer p-1 text-gray-400 hover:text-blue-600" title="Datei hochladen">
                      <Upload className="w-3.5 h-3.5" />
                      <input type="file" className="hidden" onChange={e => handleFileUpload(e, s.id)} />
                    </label>
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
          <DialogHeader><DialogTitle>{editId ? 'Dokumentquelle bearbeiten' : 'Neue Dokumentquelle'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Titel *</Label>
              <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Version</Label>
                <Input value={form.version} onChange={e => setForm({...form, version: e.target.value})} className="mt-1" /></div>
              <div><Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{['neu','relevant','veraltet','archiviert'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label className="text-xs">Relevanz</Label>
                <Select value={form.relevance} onValueChange={v => setForm({...form, relevance: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{['hoch','mittel','niedrig'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label className="text-xs">Owner</Label>
                <Input value={form.owner} onChange={e => setForm({...form, owner: e.target.value})} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Speicherort / URL</Label>
              <Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="mt-1" /></div>
            <div><Label className="text-xs">Letzte Prüfung (Datum)</Label>
              <Input type="date" value={form.last_reviewed_at} onChange={e => setForm({...form, last_reviewed_at: e.target.value})} className="mt-1" /></div>
            <div><Label className="text-xs">Beschreibung</Label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="mt-1 h-16" /></div>
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
          <AlertDialogHeader><AlertDialogTitle>Dokumentquelle löschen?</AlertDialogTitle>
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
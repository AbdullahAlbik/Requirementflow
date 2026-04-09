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
import { Plus, Pencil, Trash2, CheckSquare, Circle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUSES = [
  { value: 'offen', label: 'Offen', cls: 'bg-gray-100 text-gray-600', icon: Circle },
  { value: 'in_bearbeitung', label: 'In Bearbeitung', cls: 'bg-blue-100 text-blue-700', icon: Circle },
  { value: 'erledigt', label: 'Erledigt', cls: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  { value: 'abgebrochen', label: 'Abgebrochen', cls: 'bg-gray-100 text-gray-400', icon: Circle },
];

const emptyForm = {
  title: '', description: '', source_type: 'sonstige', source_id: '',
  assignee: '', due_date: '', status: 'offen', priority: 'mittel', notes: ''
};

export default function ActionItems() {
  const { activeWorkspace } = useWorkspace();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('alle');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (activeWorkspace) loadData(); }, [activeWorkspace]);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.ActionItem.filter({ workspace_id: activeWorkspace.id }, 'due_date');
    setItems(data);
    setLoading(false);
  };

  const filtered = filterStatus === 'alle' ? items : items.filter(i => i.status === filterStatus);

  const openCreate = () => { setForm(emptyForm); setEditId(null); setModalOpen(true); };
  const openEdit = (item) => { setForm({ ...emptyForm, ...item }); setEditId(item.id); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.title) { toast.error('Titel ist Pflichtfeld'); return; }
    setSaving(true);
    const payload = { ...form, workspace_id: activeWorkspace.id };
    if (editId) { await base44.entities.ActionItem.update(editId, payload); toast.success('Aufgabe aktualisiert'); }
    else { await base44.entities.ActionItem.create(payload); toast.success('Aufgabe angelegt'); }
    setSaving(false); setModalOpen(false); loadData();
  };

  const handleDelete = async () => {
    await base44.entities.ActionItem.delete(deleteId);
    toast.success('Aufgabe gelöscht'); setDeleteId(null); loadData();
  };

  const toggleStatus = async (item) => {
    const next = item.status === 'offen' ? 'erledigt' : 'offen';
    await base44.entities.ActionItem.update(item.id, { status: next });
    loadData();
  };

  const openCount = items.filter(i => i.status === 'offen' || i.status === 'in_bearbeitung').length;

  if (!activeWorkspace) return <div className="p-6 text-gray-400">Bitte Workspace auswählen.</div>;

  return (
    <div className="p-6">
      <PageHeader title="Offene Punkte & Aufgaben" subtitle={`${openCount} offen · ${items.length} gesamt`}
        actions={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Neue Aufgabe</Button>} />

      <div className="flex gap-2 mb-4">
        {[{ value: 'alle', label: 'Alle' }, ...STATUSES].map(s => (
          <button key={s.value} onClick={() => setFilterStatus(s.value)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filterStatus === s.value ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {s.label} {s.value === 'alle' ? `(${items.length})` : `(${items.filter(i => i.status === s.value).length})`}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8 text-gray-400">Lade...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />Keine Aufgaben
          </div>
        ) : filtered.map(item => {
          const statusCfg = STATUSES.find(s => s.value === item.status);
          const isOverdue = item.due_date && item.status !== 'erledigt' && new Date(item.due_date) < new Date();
          return (
            <div key={item.id} className={`bg-white rounded-lg border ${isOverdue ? 'border-red-200' : 'border-gray-200'} p-3 flex items-start gap-3 hover:shadow-sm`}>
              <button onClick={() => toggleStatus(item)} className="mt-0.5 text-gray-400 hover:text-green-600 flex-shrink-0">
                {item.status === 'erledigt' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`font-medium text-sm ${item.status === 'erledigt' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{item.title}</div>
                {item.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{item.description}</p>}
                <div className="flex flex-wrap gap-2 mt-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusCfg?.cls}`}>{statusCfg?.label}</span>
                  <StatusBadge value={item.priority} />
                  {item.assignee && <span className="text-xs text-gray-500">→ {item.assignee}</span>}
                  {item.due_date && <span className={`text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>📅 {item.due_date}</span>}
                  {item.source_type !== 'sonstige' && <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{item.source_type}</span>}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => openEdit(item)} className="p-1 text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteId(item.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Titel *</Label>
              <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="mt-1" /></div>
            <div><Label className="text-xs">Beschreibung</Label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="mt-1 h-16" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label className="text-xs">Priorität</Label>
                <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{['kritisch','hoch','mittel','niedrig'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label className="text-xs">Quelle</Label>
                <Select value={form.source_type} onValueChange={v => setForm({...form, source_type: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="session">Ermittlung</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="conflict">Konflikt</SelectItem>
                    <SelectItem value="sonstige">Sonstige</SelectItem>
                  </SelectContent>
                </Select></div>
              <div><Label className="text-xs">Verantwortlich</Label>
                <Input value={form.assignee} onChange={e => setForm({...form, assignee: e.target.value})} className="mt-1" /></div>
              <div><Label className="text-xs">Fälligkeitsdatum</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Notizen</Label>
              <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="mt-1 h-14" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Speichern...' : 'Speichern'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Aufgabe löschen?</AlertDialogTitle>
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
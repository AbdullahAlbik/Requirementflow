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
import { Plus, Pencil, Trash2, Search, Zap } from 'lucide-react';
import { toast } from 'sonner';

const CONFLICT_TYPES = [
  { value: 'widerspruch', label: 'Widerspruch' },
  { value: 'ueberlappung', label: 'Überlappung' },
  { value: 'luecke', label: 'Lücke' },
  { value: 'inkonsistenz', label: 'Inkonsistenz' },
  { value: 'priorisierung', label: 'Priorisierungskonflikt' },
  { value: 'sonstige', label: 'Sonstige' },
];
const STATUSES = [
  { value: 'offen', label: 'Offen', cls: 'bg-red-100 text-red-700' },
  { value: 'in_analyse', label: 'In Analyse', cls: 'bg-yellow-100 text-yellow-700' },
  { value: 'geloest', label: 'Gelöst', cls: 'bg-green-100 text-green-700' },
  { value: 'akzeptiert', label: 'Akzeptiert', cls: 'bg-blue-100 text-blue-700' },
  { value: 'eskaliert', label: 'Eskaliert', cls: 'bg-orange-100 text-orange-700' },
];

const emptyForm = {
  title: '', conflict_type: 'widerspruch', description: '', requirement_ids: '',
  stakeholder_ids: '', solution_proposal: '', status: 'offen', priority: 'mittel',
  decision: '', decision_date: '', decided_by: '', notes: ''
};

export default function Konflikte() {
  const { activeWorkspace } = useWorkspace();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('alle');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (activeWorkspace) loadData(); }, [activeWorkspace]);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.Conflict.filter({ workspace_id: activeWorkspace.id }, '-created_date');
    setItems(data);
    setLoading(false);
  };

  const filtered = items.filter(i => {
    const matchSearch = !search || i.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'alle' || i.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openCreate = () => { setForm(emptyForm); setEditId(null); setModalOpen(true); };
  const openEdit = (item) => {
    setForm({ ...emptyForm, ...item });
    setEditId(item.id); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) { toast.error('Titel ist Pflichtfeld'); return; }
    setSaving(true);
    const payload = { ...form, workspace_id: activeWorkspace.id };
    if (editId) { await base44.entities.Conflict.update(editId, payload); toast.success('Konflikt aktualisiert'); }
    else { await base44.entities.Conflict.create(payload); toast.success('Konflikt angelegt'); }
    setSaving(false); setModalOpen(false); loadData();
  };

  const handleDelete = async () => {
    await base44.entities.Conflict.delete(deleteId);
    toast.success('Konflikt gelöscht'); setDeleteId(null); loadData();
  };

  if (!activeWorkspace) return <div className="p-6 text-gray-400">Bitte Workspace auswählen.</div>;

  return (
    <div className="p-6">
      <PageHeader title="Konfliktmanagement" subtitle={`${filtered.length} Konflikte`}
        actions={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Neu</Button>} />

      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Konflikte suchen..." className="pl-8 h-8 text-sm" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Status</SelectItem>
            {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Titel</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Typ</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Status</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Priorität</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Betroffene Anforderungen</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Lade...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">
                <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />Keine Konflikte gefunden
              </td></tr>
            ) : filtered.map(item => {
              const statusCfg = STATUSES.find(s => s.value === item.status);
              return (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setDetailItem(item)}>
                  <td className="px-4 py-2.5 font-medium text-gray-900 max-w-xs truncate">{item.title}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{CONFLICT_TYPES.find(t => t.value === item.conflict_type)?.label}</td>
                  <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full ${statusCfg?.cls || 'bg-gray-100 text-gray-600'}`}>{statusCfg?.label}</span></td>
                  <td className="px-4 py-2.5"><StatusBadge value={item.priority} /></td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">{item.requirement_ids || '–'}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEdit(item)} className="p-1 text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteId(item.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail */}
      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {detailItem && (() => {
            const statusCfg = STATUSES.find(s => s.value === detailItem.status);
            return (
              <>
                <DialogHeader><DialogTitle>{detailItem.title}</DialogTitle></DialogHeader>
                <div className="space-y-3 py-2 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusCfg?.cls}`}>{statusCfg?.label}</span>
                    <StatusBadge value={detailItem.priority} />
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{CONFLICT_TYPES.find(t => t.value === detailItem.conflict_type)?.label}</span>
                  </div>
                  {detailItem.description && <div><span className="text-gray-500 text-xs font-semibold uppercase">Beschreibung</span><p className="mt-1 text-gray-700">{detailItem.description}</p></div>}
                  {detailItem.requirement_ids && <div><span className="text-gray-500">Betroffene Anforderungen:</span> <span className="font-mono text-xs">{detailItem.requirement_ids}</span></div>}
                  {detailItem.stakeholder_ids && <div><span className="text-gray-500">Beteiligte:</span> {detailItem.stakeholder_ids}</div>}
                  {detailItem.solution_proposal && <div><span className="text-gray-500 text-xs font-semibold uppercase">Lösungsvorschlag</span><p className="mt-1 text-gray-700">{detailItem.solution_proposal}</p></div>}
                  {detailItem.decision && <div><span className="text-gray-500 text-xs font-semibold uppercase">Entscheidung</span><p className="mt-1 text-gray-700">{detailItem.decision}</p></div>}
                  {detailItem.decided_by && <div><span className="text-gray-500">Entschieden von:</span> {detailItem.decided_by} {detailItem.decision_date && `(${detailItem.decision_date})`}</div>}
                  {detailItem.notes && <div><span className="text-gray-500">Notizen:</span> {detailItem.notes}</div>}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setDetailItem(null); openEdit(detailItem); }}><Pencil className="w-4 h-4 mr-1" />Bearbeiten</Button>
                  <Button variant="outline" onClick={() => setDetailItem(null)}>Schließen</Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Create/Edit */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Konflikt bearbeiten' : 'Neuer Konflikt'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Titel *</Label>
              <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Typ</Label>
                <Select value={form.conflict_type} onValueChange={v => setForm({...form, conflict_type: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{CONFLICT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select></div>
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
              <div><Label className="text-xs">Entschieden von</Label>
                <Input value={form.decided_by} onChange={e => setForm({...form, decided_by: e.target.value})} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Beschreibung</Label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="mt-1 h-16" /></div>
            <div><Label className="text-xs">Betroffene Anforderungen (UIDs, kommagetrennt)</Label>
              <Input value={form.requirement_ids} onChange={e => setForm({...form, requirement_ids: e.target.value})} className="mt-1 font-mono text-xs" /></div>
            <div><Label className="text-xs">Beteiligte Stakeholder</Label>
              <Input value={form.stakeholder_ids} onChange={e => setForm({...form, stakeholder_ids: e.target.value})} className="mt-1" /></div>
            <div><Label className="text-xs">Lösungsvorschlag</Label>
              <Textarea value={form.solution_proposal} onChange={e => setForm({...form, solution_proposal: e.target.value})} className="mt-1 h-16" /></div>
            <div><Label className="text-xs">Entscheidung</Label>
              <Textarea value={form.decision} onChange={e => setForm({...form, decision: e.target.value})} className="mt-1 h-16" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Entscheidungsdatum</Label>
                <Input type="date" value={form.decision_date} onChange={e => setForm({...form, decision_date: e.target.value})} className="mt-1" /></div>
            </div>
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
          <AlertDialogHeader><AlertDialogTitle>Konflikt löschen?</AlertDialogTitle>
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
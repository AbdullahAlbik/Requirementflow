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
import { Plus, Pencil, Trash2, Search, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';

const REVIEW_TYPES = [
  { value: 'walkthrough', label: 'Walkthrough' },
  { value: 'inspektion', label: 'Inspektion' },
  { value: 'peer_review', label: 'Peer Review' },
  { value: 'stakeholder_review', label: 'Stakeholder Review' },
  { value: 'sonstige', label: 'Sonstige' },
];
const STATUSES = ['geplant', 'in_review', 'abgeschlossen', 'abgebrochen'];
const RESULTS = ['offen', 'freigegeben', 'zurueckgewiesen', 'ueberarbeitung'];

const resultColors = {
  offen: 'bg-gray-100 text-gray-600',
  freigegeben: 'bg-green-100 text-green-700',
  zurueckgewiesen: 'bg-red-100 text-red-700',
  ueberarbeitung: 'bg-orange-100 text-orange-700',
};
const statusColors = {
  geplant: 'bg-blue-100 text-blue-700',
  in_review: 'bg-yellow-100 text-yellow-700',
  abgeschlossen: 'bg-green-100 text-green-700',
  abgebrochen: 'bg-gray-100 text-gray-500',
};

const emptyForm = {
  title: '', review_type: 'peer_review', status: 'geplant', reviewer: '',
  date: '', requirement_ids: '', result: 'offen', comments: '', notes: ''
};

export default function Reviews() {
  const { activeWorkspace } = useWorkspace();
  const [reviews, setReviews] = useState([]);
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
    const data = await base44.entities.Review.filter({ workspace_id: activeWorkspace.id }, '-created_date');
    setReviews(data);
    setLoading(false);
  };

  const filtered = reviews.filter(r => {
    const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'alle' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openCreate = () => { setForm(emptyForm); setEditId(null); setModalOpen(true); };
  const openEdit = (r) => {
    setForm({
      title: r.title || '', review_type: r.review_type || 'peer_review',
      status: r.status || 'geplant', reviewer: r.reviewer || '', date: r.date || '',
      requirement_ids: r.requirement_ids || '', result: r.result || 'offen',
      comments: r.comments || '', notes: r.notes || ''
    });
    setEditId(r.id); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) { toast.error('Titel ist Pflichtfeld'); return; }
    setSaving(true);
    const payload = { ...form, workspace_id: activeWorkspace.id };
    if (editId) { await base44.entities.Review.update(editId, payload); toast.success('Review aktualisiert'); }
    else { await base44.entities.Review.create(payload); toast.success('Review angelegt'); }
    setSaving(false); setModalOpen(false); loadData();
  };

  const handleDelete = async () => {
    await base44.entities.Review.delete(deleteId);
    toast.success('Review gelöscht'); setDeleteId(null); loadData();
  };

  if (!activeWorkspace) return <div className="p-6 text-gray-400">Bitte Workspace auswählen.</div>;

  return (
    <div className="p-6">
      <PageHeader title="Reviews & Validierung" subtitle={`${filtered.length} Reviews`}
        actions={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Neues Review</Button>} />

      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen..." className="pl-8 h-8 text-sm" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Status</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace('_',' ')}</SelectItem>)}
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
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Ergebnis</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Reviewer</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Datum</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Lade...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">
                <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />Keine Reviews gefunden
              </td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setDetailItem(r)}>
                <td className="px-4 py-2.5 font-medium text-gray-900">{r.title}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{REVIEW_TYPES.find(t => t.value === r.review_type)?.label}</td>
                <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[r.status] || 'bg-gray-100 text-gray-500'}`}>{r.status}</span></td>
                <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full ${resultColors[r.result] || 'bg-gray-100 text-gray-500'}`}>{r.result}</span></td>
                <td className="px-4 py-2.5 text-gray-500">{r.reviewer || '–'}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{r.date || '–'}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(r)} className="p-1 text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteId(r.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {detailItem && (
            <>
              <DialogHeader><DialogTitle>{detailItem.title}</DialogTitle></DialogHeader>
              <div className="space-y-3 text-sm py-2">
                <div className="flex flex-wrap gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[detailItem.status]}`}>{detailItem.status}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${resultColors[detailItem.result]}`}>{detailItem.result}</span>
                </div>
                {detailItem.reviewer && <div><span className="text-gray-500">Reviewer:</span> {detailItem.reviewer}</div>}
                {detailItem.date && <div><span className="text-gray-500">Datum:</span> {detailItem.date}</div>}
                {detailItem.requirement_ids && <div><span className="text-gray-500">Anforderungen:</span> <span className="font-mono text-xs">{detailItem.requirement_ids}</span></div>}
                {detailItem.comments && <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Kommentare</div><p className="text-gray-700 whitespace-pre-wrap">{detailItem.comments}</p></div>}
                {detailItem.notes && <div><span className="text-gray-500">Notizen:</span> {detailItem.notes}</div>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setDetailItem(null); openEdit(detailItem); }}><Pencil className="w-4 h-4 mr-1" />Bearbeiten</Button>
                <Button variant="outline" onClick={() => setDetailItem(null)}>Schließen</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Review bearbeiten' : 'Neues Review'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Titel *</Label>
              <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Typ</Label>
                <Select value={form.review_type} onValueChange={v => setForm({...form, review_type: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{REVIEW_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace('_',' ')}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label className="text-xs">Ergebnis</Label>
                <Select value={form.result} onValueChange={v => setForm({...form, result: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{RESULTS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label className="text-xs">Reviewer</Label>
                <Input value={form.reviewer} onChange={e => setForm({...form, reviewer: e.target.value})} className="mt-1" /></div>
              <div><Label className="text-xs">Datum</Label>
                <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Anforderungs-IDs (kommagetrennt)</Label>
              <Input value={form.requirement_ids} onChange={e => setForm({...form, requirement_ids: e.target.value})} className="mt-1" placeholder="z.B. PROJ1-REQ-0001, PROJ1-REQ-0002" /></div>
            <div><Label className="text-xs">Kommentare</Label>
              <Textarea value={form.comments} onChange={e => setForm({...form, comments: e.target.value})} className="mt-1 h-20" /></div>
            <div><Label className="text-xs">Notizen</Label>
              <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="mt-1 h-12" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Speichern...' : 'Speichern'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Review löschen?</AlertDialogTitle>
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
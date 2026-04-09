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
import { Plus, Pencil, Trash2, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import ImpactAnalyse from '@/components/aenderungen/ImpactAnalyse';

const STATUSES = ['neu', 'in_analyse', 'genehmigt', 'abgelehnt', 'umgesetzt', 'abgeschlossen'];
const PRIORITIES = ['kritisch', 'hoch', 'mittel', 'niedrig'];

const statusColors = {
  neu: 'bg-blue-100 text-blue-700',
  in_analyse: 'bg-yellow-100 text-yellow-700',
  genehmigt: 'bg-green-100 text-green-700',
  abgelehnt: 'bg-red-100 text-red-700',
  umgesetzt: 'bg-teal-100 text-teal-700',
  abgeschlossen: 'bg-gray-200 text-gray-700',
};

const emptyForm = {
  title: '', description: '', reason: '', impact: '',
  status: 'neu', priority: 'mittel', requester: '',
  decision_by: '', decision_date: '', requirement_ids: '', notes: ''
};

export default function Aenderungen() {
  const { activeWorkspace } = useWorkspace();
  const [changes, setChanges] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('alle');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [crCounter, setCrCounter] = useState(1);

  useEffect(() => { if (activeWorkspace) loadData(); }, [activeWorkspace]);

  const loadData = async () => {
    setLoading(true);
    const [data, reqs] = await Promise.all([
      base44.entities.ChangeRequest.filter({ workspace_id: activeWorkspace.id }, '-created_date'),
      base44.entities.Requirement.filter({ workspace_id: activeWorkspace.id }),
    ]);
    setChanges(data);
    setRequirements(reqs);
    setCrCounter(data.length + 1);
    setLoading(false);
  };

  const filtered = changes.filter(c => {
    const matchSearch = !search || c.title?.toLowerCase().includes(search.toLowerCase()) || c.uid?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'alle' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openCreate = () => { setForm(emptyForm); setEditId(null); setModalOpen(true); };
  const openEdit = (c) => {
    setForm({
      title: c.title || '', description: c.description || '', reason: c.reason || '',
      impact: c.impact || '', status: c.status || 'neu', priority: c.priority || 'mittel',
      requester: c.requester || '', decision_by: c.decision_by || '',
      decision_date: c.decision_date || '', requirement_ids: c.requirement_ids || '', notes: c.notes || ''
    });
    setEditId(c.id); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) { toast.error('Titel ist Pflichtfeld'); return; }
    setSaving(true);
    const payload = { ...form, workspace_id: activeWorkspace.id };
    if (!editId) payload.uid = `${activeWorkspace.key}-CR-${String(crCounter).padStart(4, '0')}`;
    if (editId) { await base44.entities.ChangeRequest.update(editId, payload); toast.success('Änderungsantrag aktualisiert'); }
    else { await base44.entities.ChangeRequest.create(payload); toast.success('Änderungsantrag angelegt'); }
    setSaving(false); setModalOpen(false); loadData();
  };

  const handleDelete = async () => {
    await base44.entities.ChangeRequest.delete(deleteId);
    toast.success('Gelöscht'); setDeleteId(null); loadData();
  };

  if (!activeWorkspace) return <div className="p-6 text-gray-400">Bitte Workspace auswählen.</div>;

  return (
    <div className="p-6">
      <PageHeader title="Änderungsmanagement" subtitle={`${filtered.length} Änderungsanträge`}
        actions={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Neuer Antrag</Button>} />

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
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">UID</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Titel</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Status</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Priorität</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Antragsteller</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Entscheidung</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Lade...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">
                <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-30" />Keine Änderungsanträge gefunden
              </td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setDetailItem(c)}>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{c.uid || '–'}</td>
                <td className="px-4 py-2.5 font-medium text-gray-900 max-w-xs truncate">{c.title}</td>
                <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[c.status] || 'bg-gray-100 text-gray-500'}`}>{c.status}</span></td>
                <td className="px-4 py-2.5"><StatusBadge value={c.priority} /></td>
                <td className="px-4 py-2.5 text-gray-500">{c.requester || '–'}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{c.decision_date || '–'}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(c)} className="p-1 text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteId(c.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {detailItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-gray-400">{detailItem.uid}</span>
                  <span>{detailItem.title}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm py-2">
                <div className="flex flex-wrap gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[detailItem.status]}`}>{detailItem.status}</span>
                  <StatusBadge value={detailItem.priority} />
                </div>
                {detailItem.description && <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Beschreibung</div><p className="text-gray-700 whitespace-pre-wrap">{detailItem.description}</p></div>}
                {detailItem.reason && <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Begründung</div><p className="text-gray-700">{detailItem.reason}</p></div>}
                {detailItem.impact && <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Impact-Analyse</div><p className="text-gray-700">{detailItem.impact}</p></div>}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {detailItem.requester && <div><span className="text-gray-500">Antragsteller:</span> {detailItem.requester}</div>}
                  {detailItem.decision_by && <div><span className="text-gray-500">Entscheidung durch:</span> {detailItem.decision_by}</div>}
                  {detailItem.decision_date && <div><span className="text-gray-500">Entscheidungsdatum:</span> {detailItem.decision_date}</div>}
                  {detailItem.requirement_ids && <div><span className="text-gray-500">Anforderungen:</span> <span className="font-mono">{detailItem.requirement_ids}</span></div>}
                </div>
                {detailItem.notes && <div><span className="text-gray-500">Notizen:</span> {detailItem.notes}</div>}
                <ImpactAnalyse changeRequest={detailItem} requirements={requirements} onSaved={loadData} />
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
          <DialogHeader><DialogTitle>{editId ? 'Änderungsantrag bearbeiten' : 'Neuer Änderungsantrag'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Titel *</Label>
              <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace('_',' ')}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label className="text-xs">Priorität</Label>
                <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}><StatusBadge value={p} /></SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label className="text-xs">Antragsteller</Label>
                <Input value={form.requester} onChange={e => setForm({...form, requester: e.target.value})} className="mt-1" /></div>
              <div><Label className="text-xs">Entscheidung durch</Label>
                <Input value={form.decision_by} onChange={e => setForm({...form, decision_by: e.target.value})} className="mt-1" /></div>
              <div><Label className="text-xs">Entscheidungsdatum</Label>
                <Input type="date" value={form.decision_date} onChange={e => setForm({...form, decision_date: e.target.value})} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Beschreibung</Label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="mt-1 h-16" /></div>
            <div><Label className="text-xs">Begründung</Label>
              <Textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} className="mt-1 h-16" /></div>
            <div><Label className="text-xs">Impact-Analyse</Label>
              <Textarea value={form.impact} onChange={e => setForm({...form, impact: e.target.value})} className="mt-1 h-16" /></div>
            <div><Label className="text-xs">Betroffene Anforderungs-IDs</Label>
              <Input value={form.requirement_ids} onChange={e => setForm({...form, requirement_ids: e.target.value})} className="mt-1" /></div>
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
          <AlertDialogHeader><AlertDialogTitle>Änderungsantrag löschen?</AlertDialogTitle>
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
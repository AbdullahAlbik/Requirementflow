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
import { Plus, Pencil, Trash2, Search, LayoutGrid, List, Copy, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import QualitaetsPruefung from '@/components/anforderungen/QualitaetsPruefung';
import BoardAnsicht from '@/components/anforderungen/BoardAnsicht';
import ExportButton from '@/components/shared/ExportButton';

const emptyForm = {
  title: '', description: '', acceptance_criteria: '', req_type: 'funktional',
  status: 'in_bearbeitung', priority: 'mittel', stability: 'unbekannt', criticality: 'mittel',
  source: '', source_type: 'sonstige', rationale: '', release_wanted: '', release_planned: '',
  tags: '', effort_days: '', change_reason: ''
};

const REQ_TYPES = [
  { value: 'funktional', label: 'Funktional' },
  { value: 'qualitaet', label: 'Qualität' },
  { value: 'randbedingung', label: 'Randbedingung' },
  { value: 'sonstige', label: 'Sonstige' },
];
const STATUSES = [
  'in_bearbeitung','in_pruefung','freigegeben','geaendert','zurueckgewiesen','umgesetzt','getestet','abgeschlossen'
];
const PRIORITIES = ['kritisch','hoch','mittel','niedrig'];
const SOURCE_TYPES = ['stakeholder','dokument','system','session','sonstige'];

export default function Anforderungen() {
  const { activeWorkspace } = useWorkspace();
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('alle');
  const [filterType, setFilterType] = useState('alle');
  const [filterPriority, setFilterPriority] = useState('alle');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailReq, setDetailReq] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [reqCounter, setReqCounter] = useState(1);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'board'

  useEffect(() => {
    if (activeWorkspace) loadData();
  }, [activeWorkspace]);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.Requirement.filter({ workspace_id: activeWorkspace.id }, '-created_date');
    setRequirements(data);
    setReqCounter(data.length + 1);
    setLoading(false);
  };

  const filtered = requirements.filter(r => {
    const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.uid?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'alle' || r.status === filterStatus;
    const matchType = filterType === 'alle' || r.req_type === filterType;
    const matchPriority = filterPriority === 'alle' || r.priority === filterPriority;
    return matchSearch && matchStatus && matchType && matchPriority;
  });

  const openCreate = () => {
    setForm(emptyForm);
    setEditId(null);
    setModalOpen(true);
  };

  const openEdit = (req) => {
    setForm({
      title: req.title || '', description: req.description || '',
      acceptance_criteria: req.acceptance_criteria || '', req_type: req.req_type || 'funktional',
      status: req.status || 'in_bearbeitung', priority: req.priority || 'mittel',
      stability: req.stability || 'unbekannt', criticality: req.criticality || 'mittel',
      source: req.source || '', source_type: req.source_type || 'sonstige',
      rationale: req.rationale || '', release_wanted: req.release_wanted || '',
      release_planned: req.release_planned || '', tags: req.tags || '',
      effort_days: req.effort_days || '', change_reason: ''
    });
    setEditId(req.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) { toast.error('Titel ist ein Pflichtfeld'); return; }
    setSaving(true);
    const num = editId ? null : reqCounter;
    const uid = editId ? null : `${activeWorkspace.key}-REQ-${String(num).padStart(4, '0')}`;
    const payload = { ...form, workspace_id: activeWorkspace.id, effort_days: form.effort_days ? parseFloat(form.effort_days) : null };
    if (!editId) { payload.number = num; payload.uid = uid; payload.version = '1.0'; }
    if (editId) {
      await base44.entities.Requirement.update(editId, payload);
      toast.success('Anforderung aktualisiert');
    } else {
      await base44.entities.Requirement.create(payload);
      toast.success('Anforderung angelegt');
    }
    setSaving(false);
    setModalOpen(false);
    loadData();
  };

  const handleDelete = async () => {
    await base44.entities.Requirement.delete(deleteId);
    toast.success('Anforderung gelöscht');
    setDeleteId(null);
    loadData();
  };

  const handleDuplicate = async (req) => {
    const { id, uid, number, created_date, updated_date, created_by, ...rest } = req;
    const num = reqCounter;
    const newUid = `${activeWorkspace.key}-REQ-${String(num).padStart(4, '0')}`;
    await base44.entities.Requirement.create({ ...rest, title: `${rest.title} (Kopie)`, uid: newUid, number: num, version: '1.0', status: 'in_bearbeitung' });
    toast.success('Anforderung dupliziert');
    loadData();
  };

  if (!activeWorkspace) {
    return <div className="p-6 text-gray-400">Bitte Workspace auswählen.</div>;
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Anforderungen"
        subtitle={`${filtered.length} von ${requirements.length} Einträgen`}
        actions={
          <div className="flex items-center gap-2">
            <ExportButton data={filtered} filename="anforderungen" fields={['uid','title','req_type','status','priority','version','release_planned','tags']} label="Export" />
            <div className="flex border border-gray-200 rounded-md overflow-hidden">
              <button onClick={() => setViewMode('list')} className={`px-2 py-1.5 ${viewMode==='list' ? 'bg-blue-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}><List className="w-4 h-4" /></button>
              <button onClick={() => setViewMode('board')} className={`px-2 py-1.5 ${viewMode==='board' ? 'bg-blue-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}><LayoutGrid className="w-4 h-4" /></button>
            </div>
            <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Neue Anforderung</Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Suchen nach Titel oder UID..." className="pl-8 h-8 text-sm" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Status</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}><StatusBadge value={s} /></SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Typ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Typen</SelectItem>
            {REQ_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Priorität" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Prioritäten</SelectItem>
            {PRIORITIES.map(p => <SelectItem key={p} value={p}><StatusBadge value={p} /></SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Board View */}
      {viewMode === 'board' && (
        <BoardAnsicht requirements={filtered} onEdit={openEdit} onDelete={setDeleteId} onDetail={setDetailReq} />
      )}

      {/* Table */}
      {viewMode === 'list' && <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">UID</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Titel</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Typ</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Priorität</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Review</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Version</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Lade...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Keine Anforderungen gefunden</td></tr>
              ) : filtered.map(req => (
                <tr key={req.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setDetailReq(req)}>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{req.uid || '–'}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-gray-900 max-w-xs truncate">{req.title}</div>
                    {req.quality_hints && <div className="flex items-center gap-1 mt-0.5"><AlertTriangle className="w-3 h-3 text-yellow-500" /><span className="text-xs text-yellow-600">Qualitätshinweis</span></div>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-gray-500 capitalize">{REQ_TYPES.find(t => t.value === req.req_type)?.label || req.req_type}</span>
                  </td>
                  <td className="px-4 py-2.5"><StatusBadge value={req.status} /></td>
                  <td className="px-4 py-2.5"><StatusBadge value={req.priority} /></td>
                  <td className="px-4 py-2.5"><StatusBadge value={req.review_state} /></td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{req.version || '1.0'}</td>
                  <td className="px-4 py-2.5">
                   <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                     <button onClick={() => openEdit(req)} className="p-1 text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                     <button onClick={() => handleDuplicate(req)} className="p-1 text-gray-400 hover:text-green-600" title="Duplizieren"><Copy className="w-3.5 h-3.5" /></button>
                     <button onClick={() => setDeleteId(req.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                   </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>}

      {/* Detail Modal */}
      <Dialog open={!!detailReq} onOpenChange={() => setDetailReq(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailReq && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-gray-400">{detailReq.uid}</span>
                  <span>{detailReq.title}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={detailReq.status} />
                  <StatusBadge value={detailReq.priority} />
                  <StatusBadge value={detailReq.review_state} />
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">v{detailReq.version}</span>
                </div>
                {detailReq.description && (
                  <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Beschreibung</div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{detailReq.description}</p></div>
                )}
                {detailReq.acceptance_criteria && (
                  <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Akzeptanzkriterien</div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{detailReq.acceptance_criteria}</p></div>
                )}
                {detailReq.rationale && (
                  <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Begründung</div>
                    <p className="text-sm text-gray-700">{detailReq.rationale}</p></div>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {detailReq.source && <div><span className="text-gray-500">Quelle:</span> <span>{detailReq.source}</span></div>}
                  {detailReq.release_planned && <div><span className="text-gray-500">Geplantes Release:</span> <span>{detailReq.release_planned}</span></div>}
                  {detailReq.tags && <div><span className="text-gray-500">Tags:</span> <span>{detailReq.tags}</span></div>}
                  {detailReq.effort_days && <div><span className="text-gray-500">Aufwand:</span> <span>{detailReq.effort_days} PT</span></div>}
                </div>
                {detailReq.quality_hints && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1"><AlertTriangle className="w-4 h-4 text-yellow-600" /><span className="text-xs font-semibold text-yellow-700">Qualitätshinweise</span></div>
                    <p className="text-xs text-yellow-700">{detailReq.quality_hints}</p>
                  </div>
                )}
                <QualitaetsPruefung requirement={detailReq} onUpdated={loadData} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setDetailReq(null); openEdit(detailReq); }}>
                  <Pencil className="w-4 h-4 mr-1" /> Bearbeiten
                </Button>
                <Button variant="outline" onClick={() => setDetailReq(null)}>Schließen</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit/Create Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Anforderung bearbeiten' : 'Neue Anforderung'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Titel *</Label>
              <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Typ *</Label>
                <Select value={form.req_type} onValueChange={v => setForm({...form, req_type: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{REQ_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}><StatusBadge value={s} /></SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priorität</Label>
                <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}><StatusBadge value={p} /></SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Kritikalität</Label>
                <Select value={form.criticality} onValueChange={v => setForm({...form, criticality: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{['hoch','mittel','niedrig'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Beschreibung</Label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="mt-1 h-24" />
            </div>
            <div>
              <Label className="text-xs">Akzeptanzkriterien</Label>
              <Textarea value={form.acceptance_criteria} onChange={e => setForm({...form, acceptance_criteria: e.target.value})} className="mt-1 h-16" />
            </div>
            <div>
              <Label className="text-xs">Begründung / Rationale</Label>
              <Textarea value={form.rationale} onChange={e => setForm({...form, rationale: e.target.value})} className="mt-1 h-16" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Quelltyp</Label>
                <Select value={form.source_type} onValueChange={v => setForm({...form, source_type: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Quelle</Label>
                <Input value={form.source} onChange={e => setForm({...form, source: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Gewünschtes Release</Label>
                <Input value={form.release_wanted} onChange={e => setForm({...form, release_wanted: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Geplantes Release</Label>
                <Input value={form.release_planned} onChange={e => setForm({...form, release_planned: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Aufwand (PT)</Label>
                <Input type="number" value={form.effort_days} onChange={e => setForm({...form, effort_days: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Tags (kommagetrennt)</Label>
                <Input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} className="mt-1" />
              </div>
            </div>
            {editId && (
              <div>
                <Label className="text-xs">Änderungsgrund</Label>
                <Input value={form.change_reason} onChange={e => setForm({...form, change_reason: e.target.value})} className="mt-1" placeholder="Warum wird diese Anforderung geändert?" />
              </div>
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
            <AlertDialogTitle>Anforderung löschen?</AlertDialogTitle>
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
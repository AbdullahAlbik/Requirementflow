import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/context/WorkspaceContext';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Layers, CheckCircle, Clock, Archive } from 'lucide-react';
import { toast } from 'sonner';

const statusConfig = {
  entwurf: { label: 'Entwurf', class: 'bg-blue-100 text-blue-700', icon: Clock },
  freigegeben: { label: 'Freigegeben', class: 'bg-green-100 text-green-700', icon: CheckCircle },
  archiviert: { label: 'Archiviert', class: 'bg-gray-100 text-gray-500', icon: Archive },
};

const emptyForm = {
  name: '', version: '', description: '', status: 'entwurf',
  requirement_ids: '', created_by_name: '', approved_by: '', approved_date: '', notes: ''
};

export default function Baselines() {
  const { activeWorkspace } = useWorkspace();
  const [baselines, setBaselines] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (activeWorkspace) loadData(); }, [activeWorkspace]);

  const loadData = async () => {
    setLoading(true);
    const [bls, reqs] = await Promise.all([
      base44.entities.Baseline.filter({ workspace_id: activeWorkspace.id }, '-created_date'),
      base44.entities.Requirement.filter({ workspace_id: activeWorkspace.id }),
    ]);
    setBaselines(bls);
    setRequirements(reqs);
    setLoading(false);
  };

  const openCreate = () => { setForm(emptyForm); setEditId(null); setModalOpen(true); };
  const openEdit = (b) => {
    setForm({
      name: b.name || '', version: b.version || '', description: b.description || '',
      status: b.status || 'entwurf', requirement_ids: b.requirement_ids || '',
      created_by_name: b.created_by_name || '', approved_by: b.approved_by || '',
      approved_date: b.approved_date || '', notes: b.notes || ''
    });
    setEditId(b.id); setModalOpen(true);
  };

  const captureCurrentReqs = () => {
    const allUids = requirements.filter(r => r.uid).map(r => r.uid).join(', ');
    setForm(f => ({ ...f, requirement_ids: allUids, requirement_count: requirements.length }));
    toast.success(`${requirements.length} Anforderungen übernommen`);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Name ist Pflichtfeld'); return; }
    setSaving(true);
    const reqIds = form.requirement_ids.split(',').filter(Boolean).length;
    const payload = { ...form, workspace_id: activeWorkspace.id, requirement_count: reqIds };
    if (editId) { await base44.entities.Baseline.update(editId, payload); toast.success('Baseline aktualisiert'); }
    else { await base44.entities.Baseline.create(payload); toast.success('Baseline angelegt'); }
    setSaving(false); setModalOpen(false); loadData();
  };

  const handleDelete = async () => {
    await base44.entities.Baseline.delete(deleteId);
    toast.success('Baseline gelöscht'); setDeleteId(null); loadData();
  };

  if (!activeWorkspace) return <div className="p-6 text-gray-400">Bitte Workspace auswählen.</div>;

  return (
    <div className="p-6">
      <PageHeader title="Basislinien (Baselines)" subtitle={`${baselines.length} Basislinien`}
        actions={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Neue Baseline</Button>} />

      {loading ? (
        <div className="text-center py-10 text-gray-400">Lade...</div>
      ) : baselines.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Layers className="w-10 h-10 mx-auto mb-2 opacity-30" />Keine Basislinien vorhanden
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {baselines.map(b => {
            const cfg = statusConfig[b.status] || statusConfig.entwurf;
            const Icon = cfg.icon;
            return (
              <div key={b.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm cursor-pointer"
                onClick={() => setDetailItem(b)}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-gray-900">{b.name}</div>
                    {b.version && <div className="text-xs text-gray-400 font-mono mt-0.5">v{b.version}</div>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.class}`}>
                    <Icon className="w-3 h-3" />{cfg.label}
                  </span>
                </div>
                {b.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{b.description}</p>}
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{b.requirement_count || 0} Anforderungen</span>
                  {b.approved_by && <span>Freigabe: {b.approved_by}</span>}
                </div>
                <div className="flex gap-1 mt-3 justify-end" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(b)} className="p-1 text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleteId(b.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {detailItem && (
            <>
              <DialogHeader><DialogTitle>{detailItem.name} {detailItem.version && <span className="font-mono text-sm text-gray-400">v{detailItem.version}</span>}</DialogTitle></DialogHeader>
              <div className="space-y-3 text-sm py-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig[detailItem.status]?.class}`}>{statusConfig[detailItem.status]?.label}</span>
                {detailItem.description && <p className="text-gray-700">{detailItem.description}</p>}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-gray-500">Anforderungen:</span> {detailItem.requirement_count || 0}</div>
                  {detailItem.created_by_name && <div><span className="text-gray-500">Erstellt von:</span> {detailItem.created_by_name}</div>}
                  {detailItem.approved_by && <div><span className="text-gray-500">Freigabe durch:</span> {detailItem.approved_by}</div>}
                  {detailItem.approved_date && <div><span className="text-gray-500">Freigabedatum:</span> {detailItem.approved_date}</div>}
                </div>
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
          <DialogHeader><DialogTitle>{editId ? 'Baseline bearbeiten' : 'Neue Baseline'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Version</Label>
                <Input value={form.version} onChange={e => setForm({...form, version: e.target.value})} className="mt-1" placeholder="z.B. 1.0" /></div>
              <div><Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entwurf">Entwurf</SelectItem>
                    <SelectItem value="freigegeben">Freigegeben</SelectItem>
                    <SelectItem value="archiviert">Archiviert</SelectItem>
                  </SelectContent>
                </Select></div>
              <div><Label className="text-xs">Erstellt von</Label>
                <Input value={form.created_by_name} onChange={e => setForm({...form, created_by_name: e.target.value})} className="mt-1" /></div>
              <div><Label className="text-xs">Freigabe durch</Label>
                <Input value={form.approved_by} onChange={e => setForm({...form, approved_by: e.target.value})} className="mt-1" /></div>
              <div><Label className="text-xs">Freigabedatum</Label>
                <Input type="date" value={form.approved_date} onChange={e => setForm({...form, approved_date: e.target.value})} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Beschreibung</Label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="mt-1 h-16" /></div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Anforderungs-IDs (kommagetrennt)</Label>
                <Button type="button" size="sm" variant="outline" className="h-6 text-xs px-2" onClick={captureCurrentReqs}>
                  Alle aktuellen übernehmen
                </Button>
              </div>
              <Textarea value={form.requirement_ids} onChange={e => setForm({...form, requirement_ids: e.target.value})} className="mt-1 h-16 font-mono text-xs" />
            </div>
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
          <AlertDialogHeader><AlertDialogTitle>Baseline löschen?</AlertDialogTitle>
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
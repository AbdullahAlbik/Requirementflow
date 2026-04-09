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
import { Plus, Pencil, Trash2, Workflow, GitBranch, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

// Varianten = Variant entities backed by a simple entity with variant-specific fields
// We reuse GlossaryTerm-style storage but represent Variants via a dedicated entity approach.
// Since no separate Variant entity exists, we use a lightweight approach storing in Baselines
// with a special tag — OR better: create a proper Variant entity via a new entity.
// We'll use a local "variant" category approach with existing Baseline entity repurposed,
// but cleaner: use a dedicated variants page that models variants as requirement subsets.

// Entity: Baseline with status tags used as "variant" objects
// Actually let's create a proper separate entity "Variant" below by writing to entities/Variant.json
// For now: use a self-contained page with a new Variant concept stored as Baselines with notes prefix

const STATUS_COLORS = {
  entwurf: 'bg-blue-100 text-blue-700',
  aktiv: 'bg-green-100 text-green-700',
  abgelehnt: 'bg-red-100 text-red-700',
  archiviert: 'bg-gray-100 text-gray-500',
};

const emptyForm = {
  name: '', version: '', description: '', status: 'entwurf',
  requirement_ids: '', created_by_name: '', approved_by: '', approved_date: '', notes: 'variant'
};

export default function Varianten() {
  const { activeWorkspace } = useWorkspace();
  const [variants, setVariants] = useState([]);
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
    // Variants are Baselines with notes starting with 'variant'
    setVariants(bls.filter(b => b.notes?.startsWith('variant')));
    setRequirements(reqs);
    setLoading(false);
  };

  const openCreate = () => {
    setForm({ ...emptyForm, notes: 'variant' });
    setEditId(null);
    setModalOpen(true);
  };

  const openEdit = (v) => {
    setForm({
      name: v.name || '', version: v.version || '', description: v.description || '',
      status: v.status || 'entwurf', requirement_ids: v.requirement_ids || '',
      created_by_name: v.created_by_name || '', approved_by: v.approved_by || '',
      approved_date: v.approved_date || '', notes: 'variant'
    });
    setEditId(v.id); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Name ist Pflichtfeld'); return; }
    setSaving(true);
    const reqCount = form.requirement_ids.split(',').filter(Boolean).length;
    const payload = { ...form, workspace_id: activeWorkspace.id, requirement_count: reqCount };
    if (editId) { await base44.entities.Baseline.update(editId, payload); toast.success('Variante aktualisiert'); }
    else { await base44.entities.Baseline.create(payload); toast.success('Variante angelegt'); }
    setSaving(false); setModalOpen(false); loadData();
  };

  const handleDelete = async () => {
    await base44.entities.Baseline.delete(deleteId);
    toast.success('Variante gelöscht'); setDeleteId(null); loadData();
  };

  const captureCurrentReqs = () => {
    const allUids = requirements.filter(r => r.uid).map(r => r.uid).join(', ');
    setForm(f => ({ ...f, requirement_ids: allUids }));
    toast.success(`${requirements.length} Anforderungen übernommen`);
  };

  if (!activeWorkspace) return <div className="p-6 text-gray-400">Bitte Workspace auswählen.</div>;

  return (
    <div className="p-6">
      <PageHeader title="Varianten" subtitle={`${variants.length} Varianten`}
        actions={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Neue Variante</Button>} />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-blue-700">
        <strong>Varianten</strong> ermöglichen es, unterschiedliche Anforderungskonfigurationen (z.B. für verschiedene Produktlinien oder Kunden) zu verwalten. Jede Variante enthält eine Auswahl von Anforderungen.
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Lade...</div>
      ) : variants.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <GitBranch className="w-10 h-10 mx-auto mb-2 opacity-30" />Keine Varianten vorhanden
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {variants.map(v => (
            <div key={v.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm cursor-pointer"
              onClick={() => setDetailItem(v)}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-gray-900">{v.name}</div>
                  {v.version && <div className="text-xs text-gray-400 font-mono mt-0.5">v{v.version}</div>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[v.status] || 'bg-gray-100 text-gray-500'}`}>
                  {v.status}
                </span>
              </div>
              {v.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{v.description}</p>}
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span><GitBranch className="w-3 h-3 inline mr-1" />{v.requirement_count || 0} Anforderungen</span>
                {v.approved_by && <span><CheckCircle className="w-3 h-3 inline mr-1" />{v.approved_by}</span>}
              </div>
              <div className="flex gap-1 mt-3 justify-end" onClick={e => e.stopPropagation()}>
                <button onClick={() => openEdit(v)} className="p-1 text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteId(v.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {detailItem && (
            <>
              <DialogHeader>
                <DialogTitle>{detailItem.name} {detailItem.version && <span className="font-mono text-sm text-gray-400">v{detailItem.version}</span>}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm py-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[detailItem.status]}`}>{detailItem.status}</span>
                {detailItem.description && <p className="text-gray-700">{detailItem.description}</p>}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-gray-500">Anforderungen:</span> {detailItem.requirement_count || 0}</div>
                  {detailItem.created_by_name && <div><span className="text-gray-500">Erstellt von:</span> {detailItem.created_by_name}</div>}
                  {detailItem.approved_by && <div><span className="text-gray-500">Freigabe:</span> {detailItem.approved_by}</div>}
                  {detailItem.approved_date && <div><span className="text-gray-500">Datum:</span> {detailItem.approved_date}</div>}
                </div>
                {detailItem.requirement_ids && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Enthaltene Anforderungen</div>
                    <p className="text-xs font-mono text-gray-600 bg-gray-50 p-2 rounded">{detailItem.requirement_ids}</p>
                  </div>
                )}
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
          <DialogHeader><DialogTitle>{editId ? 'Variante bearbeiten' : 'Neue Variante'}</DialogTitle></DialogHeader>
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
                    <SelectItem value="aktiv">Aktiv</SelectItem>
                    <SelectItem value="abgelehnt">Abgelehnt</SelectItem>
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
                  Alle aktuellen
                </Button>
              </div>
              <Textarea value={form.requirement_ids} onChange={e => setForm({...form, requirement_ids: e.target.value})} className="mt-1 h-16 font-mono text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Speichern...' : 'Speichern'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Variante löschen?</AlertDialogTitle>
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
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
import { Plus, Trash2, GitMerge, ArrowRight, Grid } from 'lucide-react';
import { toast } from 'sonner';
import TraceMatrix from '@/components/traceability/TraceMatrix';
import ExportButton from '@/components/shared/ExportButton';

const LINK_TYPES = [
  { value: 'verfeinert_durch', label: 'verfeinert durch' },
  { value: 'abgeleitet_von', label: 'abgeleitet von' },
  { value: 'ersetzt', label: 'ersetzt' },
  { value: 'realisiert_durch', label: 'realisiert durch' },
  { value: 'getestet_durch', label: 'getestet durch' },
  { value: 'konfligiert_mit', label: 'konfligiert mit' },
  { value: 'haengt_ab_von', label: 'hängt ab von' },
];

const emptyForm = { source_uid: '', target_uid: '', link_type: 'abgeleitet_von', notes: '' };

export default function Traceability() {
  const { activeWorkspace } = useWorkspace();
  const [links, setLinks] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);

  useEffect(() => { if (activeWorkspace) loadData(); }, [activeWorkspace]);

  const loadData = async () => {
    setLoading(true);
    const [ls, reqs] = await Promise.all([
      base44.entities.TraceLink.filter({ workspace_id: activeWorkspace.id }, '-created_date'),
      base44.entities.Requirement.filter({ workspace_id: activeWorkspace.id }, 'uid'),
    ]);
    setLinks(ls);
    setRequirements(reqs);
    setLoading(false);
  };

  const filtered = links.filter(l =>
    !search || l.source_uid?.toLowerCase().includes(search.toLowerCase()) ||
    l.target_uid?.toLowerCase().includes(search.toLowerCase())
  );

  const reqOptions = requirements.map(r => ({ value: r.uid || r.id, label: `${r.uid || r.id.slice(0,8)} – ${r.title}` }));

  const handleSave = async () => {
    if (!form.source_uid || !form.target_uid) { toast.error('Quelle und Ziel sind Pflichtfelder'); return; }
    if (form.source_uid === form.target_uid) { toast.error('Quelle und Ziel dürfen nicht identisch sein'); return; }
    setSaving(true);
    // find requirement IDs by uid
    const sourceReq = requirements.find(r => r.uid === form.source_uid);
    const targetReq = requirements.find(r => r.uid === form.target_uid);
    const payload = {
      workspace_id: activeWorkspace.id,
      source_id: sourceReq?.id || form.source_uid,
      source_uid: form.source_uid,
      target_id: targetReq?.id || form.target_uid,
      target_uid: form.target_uid,
      link_type: form.link_type,
      notes: form.notes,
    };
    await base44.entities.TraceLink.create(payload);
    toast.success('Trace-Link angelegt');
    setSaving(false); setModalOpen(false); loadData();
  };

  const handleDelete = async () => {
    await base44.entities.TraceLink.delete(deleteId);
    toast.success('Link gelöscht'); setDeleteId(null); loadData();
  };

  if (!activeWorkspace) return <div className="p-6 text-gray-400">Bitte Workspace auswählen.</div>;

  // Group links by source
  const grouped = filtered.reduce((acc, l) => {
    const key = l.source_uid || l.source_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(l);
    return acc;
  }, {});

  return (
    <div className="p-6">
      <PageHeader title="Verfolgbarkeit (Traceability)" subtitle={`${links.length} Trace-Links`}
        actions={
          <div className="flex gap-2">
            <ExportButton data={links} filename="trace-links" label="Export" />
            <Button size="sm" variant="outline" onClick={() => setShowMatrix(!showMatrix)}>
              <Grid className="w-4 h-4 mr-1" />{showMatrix ? 'Liste' : 'Matrix'}
            </Button>
            <Button size="sm" onClick={() => { setForm(emptyForm); setModalOpen(true); }}><Plus className="w-4 h-4 mr-1" />Link anlegen</Button>
          </div>
        } />

      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Suchen nach UID..." className="h-8 text-sm max-w-sm" />
      </div>

      {showMatrix && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="text-sm font-semibold text-gray-700 mb-3">Traceability-Matrix</div>
          <TraceMatrix requirements={requirements} links={links} />
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-400">Lade...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <GitMerge className="w-10 h-10 mx-auto mb-2 opacity-30" />Keine Trace-Links vorhanden
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([sourceUid, groupLinks]) => (
            <div key={sourceUid} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <span className="font-mono text-sm font-semibold text-gray-800">{sourceUid}</span>
                <span className="text-xs text-gray-400 ml-2">({groupLinks.length} Links)</span>
              </div>
              <div className="divide-y divide-gray-100">
                {groupLinks.map(link => (
                  <div key={link.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                    <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex-shrink-0">
                      {LINK_TYPES.find(t => t.value === link.link_type)?.label || link.link_type}
                    </span>
                    <span className="font-mono text-sm text-gray-700">{link.target_uid || link.target_id}</span>
                    {link.notes && <span className="text-xs text-gray-400 truncate flex-1">{link.notes}</span>}
                    <button onClick={() => setDeleteId(link.id)} className="p-1 text-gray-400 hover:text-red-600 flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Neuer Trace-Link</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Quell-Anforderung (UID) *</Label>
              <Select value={form.source_uid} onValueChange={v => setForm({...form, source_uid: v})}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Quelle wählen..." /></SelectTrigger>
                <SelectContent className="max-h-48">
                  {reqOptions.map(o => <SelectItem key={o.value} value={o.value}><span className="font-mono text-xs">{o.label}</span></SelectItem>)}
                </SelectContent>
              </Select></div>
            <div><Label className="text-xs">Link-Typ</Label>
              <Select value={form.link_type} onValueChange={v => setForm({...form, link_type: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{LINK_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label className="text-xs">Ziel-Anforderung (UID) *</Label>
              <Select value={form.target_uid} onValueChange={v => setForm({...form, target_uid: v})}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Ziel wählen..." /></SelectTrigger>
                <SelectContent className="max-h-48">
                  {reqOptions.map(o => <SelectItem key={o.value} value={o.value}><span className="font-mono text-xs">{o.label}</span></SelectItem>)}
                </SelectContent>
              </Select></div>
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
          <AlertDialogHeader><AlertDialogTitle>Trace-Link löschen?</AlertDialogTitle>
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
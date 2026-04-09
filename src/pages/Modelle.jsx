import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/context/WorkspaceContext';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Search, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = { term: '', definition: '', abbreviation: '', synonyms: '', source: '', domain: '', notes: '' };

export default function Modelle() {
  const { activeWorkspace } = useWorkspace();
  const [terms, setTerms] = useState([]);
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
    const data = await base44.entities.GlossaryTerm.filter({ workspace_id: activeWorkspace.id }, 'term');
    setTerms(data);
    setLoading(false);
  };

  const filtered = terms.filter(t =>
    !search || t.term?.toLowerCase().includes(search.toLowerCase()) ||
    t.definition?.toLowerCase().includes(search.toLowerCase())
  );

  // Group by first letter
  const grouped = filtered.reduce((acc, t) => {
    const letter = (t.term?.[0] || '#').toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(t);
    return acc;
  }, {});

  const openCreate = () => { setForm(emptyForm); setEditId(null); setModalOpen(true); };
  const openEdit = (t) => {
    setForm({ term: t.term || '', definition: t.definition || '', abbreviation: t.abbreviation || '',
      synonyms: t.synonyms || '', source: t.source || '', domain: t.domain || '', notes: t.notes || '' });
    setEditId(t.id); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.term) { toast.error('Begriff ist Pflichtfeld'); return; }
    setSaving(true);
    const payload = { ...form, workspace_id: activeWorkspace.id };
    if (editId) { await base44.entities.GlossaryTerm.update(editId, payload); toast.success('Begriff aktualisiert'); }
    else { await base44.entities.GlossaryTerm.create(payload); toast.success('Begriff angelegt'); }
    setSaving(false); setModalOpen(false); loadData();
  };

  const handleDelete = async () => {
    await base44.entities.GlossaryTerm.delete(deleteId);
    toast.success('Begriff gelöscht'); setDeleteId(null); loadData();
  };

  if (!activeWorkspace) return <div className="p-6 text-gray-400">Bitte Workspace auswählen.</div>;

  return (
    <div className="p-6">
      <PageHeader title="Modelle & Glossar" subtitle={`${terms.length} Begriffe`}
        actions={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Begriff hinzufügen</Button>} />

      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Begriff oder Definition suchen..." className="pl-8 h-8 text-sm" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Lade...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />Kein Glossar-Eintrag gefunden
        </div>
      ) : (
        <div className="space-y-4">
          {Object.keys(grouped).sort().map(letter => (
            <div key={letter}>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-100 pb-1">{letter}</div>
              <div className="space-y-2">
                {grouped[letter].map(t => (
                  <div key={t.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-start gap-4 hover:shadow-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{t.term}</span>
                        {t.abbreviation && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">{t.abbreviation}</span>}
                        {t.domain && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{t.domain}</span>}
                      </div>
                      {t.definition && <p className="text-sm text-gray-700">{t.definition}</p>}
                      {t.synonyms && <p className="text-xs text-gray-400 mt-1">Synonyme: {t.synonyms}</p>}
                      {t.source && <p className="text-xs text-gray-400">Quelle: {t.source}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(t)} className="p-1 text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteId(t.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Begriff bearbeiten' : 'Neuer Glossar-Eintrag'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Begriff *</Label>
              <Input value={form.term} onChange={e => setForm({...form, term: e.target.value})} className="mt-1" /></div>
            <div><Label className="text-xs">Definition</Label>
              <Textarea value={form.definition} onChange={e => setForm({...form, definition: e.target.value})} className="mt-1 h-20" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Abkürzung</Label>
                <Input value={form.abbreviation} onChange={e => setForm({...form, abbreviation: e.target.value})} className="mt-1" /></div>
              <div><Label className="text-xs">Domäne</Label>
                <Input value={form.domain} onChange={e => setForm({...form, domain: e.target.value})} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Synonyme</Label>
              <Input value={form.synonyms} onChange={e => setForm({...form, synonyms: e.target.value})} className="mt-1" /></div>
            <div><Label className="text-xs">Quelle</Label>
              <Input value={form.source} onChange={e => setForm({...form, source: e.target.value})} className="mt-1" /></div>
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
          <AlertDialogHeader><AlertDialogTitle>Begriff löschen?</AlertDialogTitle>
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
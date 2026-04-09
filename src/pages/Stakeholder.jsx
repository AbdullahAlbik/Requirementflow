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
import { Plus, Pencil, Trash2, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import StakeholderAnalyse from '@/components/stakeholder/StakeholderAnalyse';

const emptyForm = {
  name: '', role: '', classification: 'primaer', contact: '', notes: '',
  persona: '', influence: 'mittel', interest: 'mittel', internal_external: 'intern',
  user_group: '', is_misuser: false
};

export default function Stakeholder() {
  const { activeWorkspace } = useWorkspace();
  const [stakeholders, setStakeholders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (activeWorkspace) loadData(); }, [activeWorkspace]);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.Stakeholder.filter({ workspace_id: activeWorkspace.id }, '-created_date');
    setStakeholders(data);
    setLoading(false);
  };

  const filtered = stakeholders.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.role?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setForm(emptyForm); setEditId(null); setModalOpen(true); };
  const openEdit = (s) => {
    setForm({ name: s.name || '', role: s.role || '', classification: s.classification || 'primaer',
      contact: s.contact || '', notes: s.notes || '', persona: s.persona || '',
      influence: s.influence || 'mittel', interest: s.interest || 'mittel',
      internal_external: s.internal_external || 'intern', user_group: s.user_group || '',
      is_misuser: s.is_misuser || false });
    setEditId(s.id); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Name ist Pflichtfeld'); return; }
    setSaving(true);
    const payload = { ...form, workspace_id: activeWorkspace.id };
    if (editId) { await base44.entities.Stakeholder.update(editId, payload); toast.success('Stakeholder aktualisiert'); }
    else { await base44.entities.Stakeholder.create(payload); toast.success('Stakeholder angelegt'); }
    setSaving(false); setModalOpen(false); loadData();
  };

  const handleDelete = async () => {
    await base44.entities.Stakeholder.delete(deleteId);
    toast.success('Stakeholder gelöscht'); setDeleteId(null); loadData();
  };

  if (!activeWorkspace) return <div className="p-6 text-gray-400">Bitte Workspace auswählen.</div>;

  return (
    <div className="p-6">
      <PageHeader title="Stakeholder" subtitle={`${filtered.length} Einträge`}
        actions={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Neu</Button>} />

      <div className="mb-4">
        <StakeholderAnalyse stakeholders={stakeholders} requirements={[]} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Suchen nach Name oder Rolle..." className="pl-8 h-8 text-sm" />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Name</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Rolle</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Klassifikation</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Einfluss</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Interesse</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Intern/Extern</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Lade...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />Keine Stakeholder gefunden
              </td></tr>
            ) : filtered.map(s => (
              <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                onClick={() => setDetailItem(s)}>
                <td className="px-4 py-2.5 font-medium text-gray-900">{s.name}</td>
                <td className="px-4 py-2.5 text-gray-600">{s.role || '–'}</td>
                <td className="px-4 py-2.5">
                  <span className="text-xs capitalize bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s.classification}</span>
                </td>
                <td className="px-4 py-2.5"><StatusBadge value={s.influence} /></td>
                <td className="px-4 py-2.5"><StatusBadge value={s.interest} /></td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.internal_external === 'intern' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                    {s.internal_external}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(s)} className="p-1 text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteId(s.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-lg">
          {detailItem && (
            <>
              <DialogHeader><DialogTitle>{detailItem.name}</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2 text-sm">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={detailItem.influence} />
                  <StatusBadge value={detailItem.interest} />
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{detailItem.classification}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${detailItem.internal_external === 'intern' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>{detailItem.internal_external}</span>
                </div>
                {detailItem.role && <div><span className="text-gray-500">Rolle:</span> {detailItem.role}</div>}
                {detailItem.contact && <div><span className="text-gray-500">Kontakt:</span> {detailItem.contact}</div>}
                {detailItem.user_group && <div><span className="text-gray-500">Nutzergruppe:</span> {detailItem.user_group}</div>}
                {detailItem.persona && <div><span className="text-gray-500">Persona:</span> <p className="mt-1 text-gray-700">{detailItem.persona}</p></div>}
                {detailItem.notes && <div><span className="text-gray-500">Notizen:</span> <p className="mt-1 text-gray-700">{detailItem.notes}</p></div>}
                {detailItem.is_misuser && <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">⚠ Misuser-Hinweis vorhanden</div>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setDetailItem(null); openEdit(detailItem); }}><Pencil className="w-4 h-4 mr-1" />Bearbeiten</Button>
                <Button variant="outline" onClick={() => setDetailItem(null)}>Schließen</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Stakeholder bearbeiten' : 'Neuer Stakeholder'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="mt-1" /></div>
            <div><Label className="text-xs">Rolle</Label>
              <Input value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Klassifikation</Label>
                <Select value={form.classification} onValueChange={v => setForm({...form, classification: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primaer">Primär</SelectItem>
                    <SelectItem value="sekundaer">Sekundär</SelectItem>
                    <SelectItem value="tertiaer">Tertiär</SelectItem>
                  </SelectContent>
                </Select></div>
              <div><Label className="text-xs">Intern / Extern</Label>
                <Select value={form.internal_external} onValueChange={v => setForm({...form, internal_external: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intern">Intern</SelectItem>
                    <SelectItem value="extern">Extern</SelectItem>
                  </SelectContent>
                </Select></div>
              <div><Label className="text-xs">Einfluss</Label>
                <Select value={form.influence} onValueChange={v => setForm({...form, influence: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hoch">Hoch</SelectItem>
                    <SelectItem value="mittel">Mittel</SelectItem>
                    <SelectItem value="niedrig">Niedrig</SelectItem>
                  </SelectContent>
                </Select></div>
              <div><Label className="text-xs">Interesse</Label>
                <Select value={form.interest} onValueChange={v => setForm({...form, interest: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hoch">Hoch</SelectItem>
                    <SelectItem value="mittel">Mittel</SelectItem>
                    <SelectItem value="niedrig">Niedrig</SelectItem>
                  </SelectContent>
                </Select></div>
            </div>
            <div><Label className="text-xs">Kontakt</Label>
              <Input value={form.contact} onChange={e => setForm({...form, contact: e.target.value})} className="mt-1" /></div>
            <div><Label className="text-xs">Nutzergruppe</Label>
              <Input value={form.user_group} onChange={e => setForm({...form, user_group: e.target.value})} className="mt-1" /></div>
            <div><Label className="text-xs">Persona</Label>
              <Textarea value={form.persona} onChange={e => setForm({...form, persona: e.target.value})} className="mt-1 h-16" /></div>
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
          <AlertDialogHeader><AlertDialogTitle>Stakeholder löschen?</AlertDialogTitle>
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
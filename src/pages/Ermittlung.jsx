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
import { Plus, Pencil, Trash2, Search, BookOpen, Calendar, Users } from 'lucide-react';
import { toast } from 'sonner';
import KIErmittlungsAssistent from '@/components/ermittlung/KIErmittlungsAssistent';

const SESSION_TYPES = [
  { value: 'interview', label: 'Interview' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'brainstorming', label: 'Brainstorming' },
  { value: 'beobachtung', label: 'Beobachtung' },
  { value: 'fragebogen', label: 'Fragebogen' },
  { value: 'prototyping', label: 'Prototyping' },
  { value: 'sonstige', label: 'Sonstige' },
];

const STATUS_COLORS = {
  geplant: 'bg-blue-100 text-blue-700',
  durchgefuehrt: 'bg-yellow-100 text-yellow-700',
  ausgewertet: 'bg-orange-100 text-orange-700',
  abgeschlossen: 'bg-green-100 text-green-700',
};

const emptyForm = {
  title: '', session_type: 'interview', date: '', participants: '',
  location: '', status: 'geplant', goals: '', results: '', open_points: '', notes: '', moderator: ''
};

export default function Ermittlung() {
  const { activeWorkspace } = useWorkspace();
  const [sessions, setSessions] = useState([]);
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
    const data = await base44.entities.ElicitationSession.filter({ workspace_id: activeWorkspace.id }, '-date');
    setSessions(data);
    setLoading(false);
  };

  const filtered = sessions.filter(s => {
    const matchSearch = !search || s.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'alle' || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openCreate = () => { setForm(emptyForm); setEditId(null); setModalOpen(true); };
  const openEdit = (s) => {
    setForm({
      title: s.title || '', session_type: s.session_type || 'interview', date: s.date || '',
      participants: s.participants || '', location: s.location || '', status: s.status || 'geplant',
      goals: s.goals || '', results: s.results || '', open_points: s.open_points || '',
      notes: s.notes || '', moderator: s.moderator || ''
    });
    setEditId(s.id); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) { toast.error('Titel ist Pflichtfeld'); return; }
    setSaving(true);
    const payload = { ...form, workspace_id: activeWorkspace.id };
    if (editId) { await base44.entities.ElicitationSession.update(editId, payload); toast.success('Session aktualisiert'); }
    else { await base44.entities.ElicitationSession.create(payload); toast.success('Session angelegt'); }
    setSaving(false); setModalOpen(false); loadData();
  };

  const handleDelete = async () => {
    await base44.entities.ElicitationSession.delete(deleteId);
    toast.success('Session gelöscht'); setDeleteId(null); loadData();
  };

  if (!activeWorkspace) return <div className="p-6 text-gray-400">Bitte Workspace auswählen.</div>;

  return (
    <div className="p-6">
      <PageHeader title="Ermittlung (Elicitation)" subtitle={`${filtered.length} Sessions`}
        actions={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Neue Session</Button>} />

      <div className="mb-4">
        <KIErmittlungsAssistent
          workspaceId={activeWorkspace.id}
          workspaceKey={activeWorkspace.key}
          onReqsCreated={() => {}}
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen..." className="pl-8 h-8 text-sm" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Status</SelectItem>
            {['geplant','durchgefuehrt','ausgewertet','abgeschlossen'].map(s => (
              <SelectItem key={s} value={s}>{s.replace('_',' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-10 text-gray-400">Lade...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-3 text-center py-10 text-gray-400">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />Keine Ermittlungssessions gefunden
          </div>
        ) : filtered.map(s => (
          <div key={s.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm cursor-pointer"
            onClick={() => setDetailItem(s)}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="font-medium text-gray-900 text-sm">{s.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {SESSION_TYPES.find(t => t.value === s.session_type)?.label}
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-600'}`}>
                {s.status}
              </span>
            </div>
            {s.date && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <Calendar className="w-3 h-3" /> {s.date}
              </div>
            )}
            {s.participants && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <Users className="w-3 h-3" /> {s.participants}
              </div>
            )}
            {s.goals && <p className="text-xs text-gray-600 mt-2 line-clamp-2">{s.goals}</p>}
            <div className="flex gap-1 mt-3 justify-end" onClick={e => e.stopPropagation()}>
              <button onClick={() => openEdit(s)} className="p-1 text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => setDeleteId(s.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {detailItem && (
            <>
              <DialogHeader>
                <DialogTitle>{detailItem.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm py-2">
                <div className="flex flex-wrap gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[detailItem.status] || 'bg-gray-100 text-gray-600'}`}>{detailItem.status}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{SESSION_TYPES.find(t => t.value === detailItem.session_type)?.label}</span>
                </div>
                {detailItem.date && <div><span className="text-gray-500">Datum:</span> {detailItem.date}</div>}
                {detailItem.moderator && <div><span className="text-gray-500">Moderator:</span> {detailItem.moderator}</div>}
                {detailItem.location && <div><span className="text-gray-500">Ort:</span> {detailItem.location}</div>}
                {detailItem.participants && <div><span className="text-gray-500">Teilnehmer:</span> {detailItem.participants}</div>}
                {detailItem.goals && <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Ziele</div><p className="text-gray-700 whitespace-pre-wrap">{detailItem.goals}</p></div>}
                {detailItem.results && <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Ergebnisse</div><p className="text-gray-700 whitespace-pre-wrap">{detailItem.results}</p></div>}
                {detailItem.open_points && <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Offene Punkte</div><p className="text-gray-700 whitespace-pre-wrap">{detailItem.open_points}</p></div>}
                {detailItem.notes && <div><div className="text-xs font-semibold text-gray-500 uppercase mb-1">Notizen</div><p className="text-gray-700">{detailItem.notes}</p></div>}
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
          <DialogHeader><DialogTitle>{editId ? 'Session bearbeiten' : 'Neue Ermittlungssession'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Titel *</Label>
              <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Typ</Label>
                <Select value={form.session_type} onValueChange={v => setForm({...form, session_type: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{SESSION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['geplant','durchgefuehrt','ausgewertet','abgeschlossen'].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select></div>
              <div><Label className="text-xs">Datum</Label>
                <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="mt-1" /></div>
              <div><Label className="text-xs">Moderator</Label>
                <Input value={form.moderator} onChange={e => setForm({...form, moderator: e.target.value})} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Teilnehmer (kommagetrennt)</Label>
              <Input value={form.participants} onChange={e => setForm({...form, participants: e.target.value})} className="mt-1" /></div>
            <div><Label className="text-xs">Ort</Label>
              <Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="mt-1" /></div>
            <div><Label className="text-xs">Ziele</Label>
              <Textarea value={form.goals} onChange={e => setForm({...form, goals: e.target.value})} className="mt-1 h-16" /></div>
            <div><Label className="text-xs">Ergebnisse</Label>
              <Textarea value={form.results} onChange={e => setForm({...form, results: e.target.value})} className="mt-1 h-16" /></div>
            <div><Label className="text-xs">Offene Punkte</Label>
              <Textarea value={form.open_points} onChange={e => setForm({...form, open_points: e.target.value})} className="mt-1 h-16" /></div>
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
          <AlertDialogHeader><AlertDialogTitle>Session löschen?</AlertDialogTitle>
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
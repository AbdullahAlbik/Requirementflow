import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/context/RBACContext';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Building2, Users, FolderOpen, Crown } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = { name: '', key: '', description: '', contact_email: '', status: 'aktiv', notes: '' };
const emptyAdminForm = { email: '' };

export default function Mandanten() {
  const { currentUser, isSuper } = useRBAC();
  const [mandanten, setMandanten] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [mandantUsers, setMandantUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  // Mandant CRUD
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Admin einladen
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [inviting, setInviting] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [mList, wList] = await Promise.all([
      base44.entities.Mandant.list('-created_date'),
      base44.entities.Workspace.list('-created_date'),
    ]);
    setMandanten(mList);
    setWorkspaces(wList);
    if (mList.length > 0 && !selected) setSelected(mList[0]);
    setLoading(false);
  };

  // Load users for selected mandant
  useEffect(() => {
    if (selected?.id) {
      base44.entities.User.list('-created_date').then(users => {
        setMandantUsers(users.filter(u => u.mandant_id === selected.id));
      });
    }
  }, [selected]);

  const mandantWorkspaces = workspaces.filter(ws => ws.mandant_id === selected?.id);

  const openCreate = () => { setForm(emptyForm); setEditId(null); setModalOpen(true); };
  const openEdit = (m) => {
    setForm({ name: m.name, key: m.key, description: m.description || '', contact_email: m.contact_email || '', status: m.status || 'aktiv', notes: m.notes || '' });
    setEditId(m.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.key) { toast.error('Name und Key sind Pflichtfelder'); return; }
    setSaving(true);
    if (editId) {
      await base44.entities.Mandant.update(editId, form);
      toast.success('Mandant aktualisiert');
    } else {
      const created = await base44.entities.Mandant.create(form);
      toast.success('Mandant angelegt');
    }
    setSaving(false);
    setModalOpen(false);
    loadAll();
  };

  const handleDelete = async () => {
    await base44.entities.Mandant.delete(deleteId);
    toast.success('Mandant gelöscht');
    setDeleteId(null);
    setSelected(null);
    loadAll();
  };

  const handleInviteAdmin = async () => {
    if (!adminForm.email) { toast.error('E-Mail ist Pflichtfeld'); return; }
    setInviting(true);
    await base44.users.inviteUser(adminForm.email, 'user');
    // Log the invitation
    await base44.entities.AuditLog.create({
      workspace_id: '',
      entity_type: 'User',
      entity_id: adminForm.email,
      action: 'erstellt',
      field_name: 'role',
      new_value: 'general_admin',
      change_reason: `General Admin für Mandant ${selected?.name} eingeladen`,
      user_email: currentUser?.email,
      user_name: currentUser?.full_name || currentUser?.email,
    });
    toast.success(`General Admin ${adminForm.email} für ${selected?.name} eingeladen. Bitte nach dem Login Rolle + Mandant in "Nutzer & Rollen" zuweisen.`);
    setInviting(false);
    setAdminModalOpen(false);
    setAdminForm(emptyAdminForm);
  };

  if (loading) return <div className="p-6 text-center text-gray-400 py-16">Lade...</div>;

  if (!isSuper) {
    return (
      <div className="p-6 text-center py-16 text-gray-400">
        <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p>Kein Zugriff. Nur Super-Admins können Mandanten verwalten.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Mandantenverwaltung"
        subtitle={`${mandanten.length} Mandanten (Firmen / Kunden)`}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Mandant anlegen
          </Button>
        }
      />

      <div className="flex gap-5">
        {/* Mandanten-Liste */}
        <div className="w-64 flex-shrink-0 space-y-1.5">
          {mandanten.map(m => (
            <button
              key={m.id}
              onClick={() => setSelected(m)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors
                ${selected?.id === m.id ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1 truncate">
                  <div className="font-medium truncate">{m.name}</div>
                  <div className="text-xs opacity-60 font-mono">{m.key}</div>
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${m.status === 'aktiv' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {m.status}
                </span>
              </div>
            </button>
          ))}
          {mandanten.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              <Building2 className="w-8 h-8 mx-auto mb-1 opacity-30" />
              Noch keine Mandanten
            </div>
          )}
        </div>

        {/* Detail-Bereich */}
        {selected && (
          <div className="flex-1 space-y-4">
            {/* Mandant Header */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
                  <p className="text-xs text-gray-400 font-mono">{selected.key}</p>
                  {selected.description && <p className="text-sm text-gray-600 mt-1">{selected.description}</p>}
                  {selected.contact_email && <p className="text-xs text-gray-500 mt-1">📧 {selected.contact_email}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setAdminModalOpen(true); }}>
                    <Crown className="w-3.5 h-3.5 mr-1" /> Admin einladen
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(selected)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Bearbeiten
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => setDeleteId(selected.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Workspaces des Mandanten */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-blue-600" />
                  Workspaces ({mandantWorkspaces.length})
                </h3>
              </div>
              {mandantWorkspaces.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Noch keine Workspaces für diesen Mandanten</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {mandantWorkspaces.map(ws => (
                    <div key={ws.id} className="border border-gray-100 rounded-lg p-3 flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <FolderOpen className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-sm text-gray-900">{ws.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{ws.key}</div>
                      </div>
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${ws.mode === 'projekt' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                        {ws.mode}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* General Admins des Mandanten */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                  <Crown className="w-4 h-4 text-purple-600" />
                  General Admins ({mandantUsers.filter(u => u.role === 'general_admin').length})
                </h3>
              </div>
              {mandantUsers.filter(u => u.role === 'general_admin').length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-3">Noch keine General Admins für diesen Mandanten</p>
              ) : (
                <div className="space-y-2">
                  {mandantUsers.filter(u => u.role === 'general_admin').map(u => (
                    <div key={u.id} className="flex items-center gap-3 py-1.5">
                      <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
                        {u.full_name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{u.full_name || u.email}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mandant erstellen/bearbeiten */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? 'Mandant bearbeiten' : 'Neuer Mandant'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1" placeholder="Firmenname" />
              </div>
              <div>
                <Label className="text-xs">Key *</Label>
                <Input value={form.key} onChange={e => setForm({ ...form, key: e.target.value.toUpperCase() })} className="mt-1" placeholder="FIRMA1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Beschreibung</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1 h-16" />
            </div>
            <div>
              <Label className="text-xs">Kontakt E-Mail</Label>
              <Input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} className="mt-1" placeholder="kontakt@firma.de" />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktiv">Aktiv</SelectItem>
                  <SelectItem value="gesperrt">Gesperrt</SelectItem>
                  <SelectItem value="archiviert">Archiviert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Speichern...' : 'Speichern'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin einladen */}
      <Dialog open={adminModalOpen} onOpenChange={setAdminModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>General Admin einladen</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500">Für Mandant: <strong>{selected?.name}</strong></p>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">E-Mail *</Label>
              <Input type="email" value={adminForm.email} onChange={e => setAdminForm({ ...adminForm, email: e.target.value })} className="mt-1" placeholder="admin@firma.de" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdminModalOpen(false)}>Abbrechen</Button>
            <Button onClick={handleInviteAdmin} disabled={inviting}>{inviting ? 'Sende...' : 'Einladen'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Löschen */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mandant löschen?</AlertDialogTitle>
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
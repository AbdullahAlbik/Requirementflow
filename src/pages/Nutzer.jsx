import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useRBAC } from '@/context/RBACContext';
import { getRoleLabel, getRoleBadgeClass } from '@/lib/rbac';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Crown, Building2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const memberRoleLabel = {
  workspace_admin: { label: 'Admin', class: 'bg-blue-100 text-blue-700' },
  member: { label: 'Mitglied', class: 'bg-gray-100 text-gray-600' },
};

export default function Nutzer() {
  const { workspaces } = useWorkspace();
  const { currentUser, isSuper, isGenAdmin, isWsAdmin, role } = useRBAC();
  const [allUsers, setAllUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [mandanten, setMandanten] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteWorkspaceId, setInviteWorkspaceId] = useState('');
  const [inviteMode, setInviteMode] = useState('platform'); // 'platform' | 'workspace'
  const [inviting, setInviting] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (workspaces.length > 0 && !selectedWorkspace) {
      setSelectedWorkspace(workspaces[0]);
    }
  }, [workspaces]);

  useEffect(() => {
    if (selectedWorkspace) loadMembers(selectedWorkspace.id);
  }, [selectedWorkspace]);

  const loadData = async () => {
    setLoading(true);
    const [users, mds] = await Promise.all([
      base44.entities.User.list('-created_date'),
      base44.entities.Mandant.list('-created_date'),
    ]);
    // Filter users by mandant scope (general_admin only sees their mandant)
    const filtered = (isSuper)
      ? users
      : users.filter(u => u.mandant_id === currentUser?.mandant_id || !u.mandant_id);
    setAllUsers(filtered);
    setMandanten(mds);
    setLoading(false);
  };

  const loadMembers = async (workspaceId) => {
    const data = await base44.entities.WorkspaceMember.filter({ workspace_id: workspaceId });
    setMembers(data);
  };

  // Use RBAC context values directly

  // --- Plattform-Nutzer einladen (nur general_admin / super_admin) ---
  // Die Plattform erlaubt nur 'user' oder 'admin' als Einladungsrolle.
  // Die App-interne Rolle (general_admin, workspace_admin, member) wird
  // in der User-Entity gespeichert und muss nach dem ersten Login gesetzt werden.
  const handleInvitePlatform = async () => {
    if (!inviteEmail) { toast.error('E-Mail ist Pflichtfeld'); return; }
    setInviting(true);
    // Immer als 'user' einladen (Plattform-Constraint)
    await base44.users.inviteUser(inviteEmail, 'user');
    toast.success(`Einladung an ${inviteEmail} gesendet (App-Rolle: ${inviteRole}). Bitte nach erstem Login die Rolle zuweisen.`);
    setInviting(false);
    setInviteOpen(false);
    setInviteEmail('');
    setInviteRole('member');
    loadData();
  };

  // --- Workspace-Mitglied einladen ---
  const handleInviteWorkspaceMember = async () => {
    if (!inviteEmail || !inviteWorkspaceId) { toast.error('Bitte alle Felder ausfüllen'); return; }
    setInviting(true);
    // Plattform-Einladung immer als 'user' (einzige erlaubte Rolle neben 'admin')
    await base44.users.inviteUser(inviteEmail, 'user');
    // WorkspaceMember-Eintrag anlegen
    await base44.entities.WorkspaceMember.create({
      workspace_id: inviteWorkspaceId,
      user_email: inviteEmail,
      role: inviteRole,
      invited_by: currentUser?.email,
      status: 'eingeladen',
    });
    toast.success(`${inviteEmail} zu Workspace eingeladen`);
    setInviting(false);
    setInviteOpen(false);
    setInviteEmail('');
    setInviteRole('member');
    if (selectedWorkspace?.id === inviteWorkspaceId) loadMembers(inviteWorkspaceId);
  };

  const handleRemoveMember = async () => {
    await base44.entities.WorkspaceMember.delete(deleteTarget.id);
    toast.success('Mitglied entfernt');
    setDeleteTarget(null);
    loadMembers(selectedWorkspace.id);
  };

  const handleChangeRole = async (member, newRole) => {
    await base44.entities.WorkspaceMember.update(member.id, { role: newRole });
    toast.success('Rolle aktualisiert');
    loadMembers(selectedWorkspace.id);
  };

  // App-interne Rolle + Mandant eines Plattform-Nutzers setzen
  const handleChangeUserAppRole = async (userId, newRole, userMandantId) => {
    const updateData = { role: newRole };
    // If general_admin assigns within their mandant, set mandant_id
    if (!isSuper && currentUser?.mandant_id) {
      updateData.mandant_id = currentUser.mandant_id;
    }
    await base44.entities.User.update(userId, updateData);
    // Audit log
    await base44.entities.AuditLog.create({
      workspace_id: '',
      entity_type: 'User',
      entity_id: userId,
      action: 'geaendert',
      field_name: 'role',
      new_value: newRole,
      user_email: currentUser?.email,
      user_name: currentUser?.full_name || currentUser?.email,
    });
    toast.success('App-Rolle aktualisiert');
    loadData();
  };

  if (loading) return <div className="p-6 text-center text-gray-400 py-16">Lade...</div>;

  return (
    <div className="p-6">
      <PageHeader
        title="Nutzer & Rollen"
        subtitle={isGenAdmin ? `${getRoleLabel(role)} – Benutzerverwaltung` : 'Workspace-Verwaltung'}
        actions={
          isGenAdmin ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setInviteMode('workspace'); setInviteOpen(true); }}>
                <UserPlus className="w-4 h-4 mr-1" /> Workspace-Mitglied einladen
              </Button>
              <Button size="sm" onClick={() => { setInviteMode('platform'); setInviteOpen(true); }}>
                <Crown className="w-4 h-4 mr-1" /> Nutzer einladen
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => { setInviteMode('workspace'); setInviteOpen(true); }}>
              <UserPlus className="w-4 h-4 mr-1" /> Mitglied einladen
            </Button>
          )
        }
      />

      <Tabs defaultValue={isGenAdmin ? 'platform' : 'workspace'}>
        {isGenAdmin && (
          <TabsList className="mb-4">
            <TabsTrigger value="platform">Alle Nutzer</TabsTrigger>
            <TabsTrigger value="workspace">Pro Workspace</TabsTrigger>
          </TabsList>
        )}

        {/* TAB: Alle Nutzer (nur general_admin / super_admin) */}
        {isGenAdmin && (
          <TabsContent value="platform">
            {isSuper && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                💡 <strong>Hinweis:</strong> Neue Nutzer werden per E-Mail eingeladen. Die App-Rolle kann hier direkt zugewiesen werden.
              </div>
            )}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Name</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">E-Mail</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">App-Rolle</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Seit</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-8 text-gray-400">Keine Nutzer</td></tr>
                  ) : allUsers.map(u => {
                    const isMe = u.email === currentUser?.email;
                    const roleCls = getRoleBadgeClass(u.role);
                    const roleText = getRoleLabel(u.role);
                    const mandantName = mandanten.find(m => m.id === u.mandant_id)?.name || '–';
                    return (
                      <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">
                              {u.full_name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{u.full_name || '–'}</div>
                              {isSuper && <div className="text-xs text-gray-400">{mandantName}</div>}
                            </div>
                            {isMe && <span className="text-xs text-gray-400">(ich)</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 text-sm">{u.email}</td>
                        <td className="px-4 py-2.5">
                          {(isSuper || (isGenAdmin && !isMe)) ? (
                            <Select value={u.role || 'member'} onValueChange={val => handleChangeUserAppRole(u.id, val)}>
                              <SelectTrigger className="h-7 text-xs w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {isSuper && <SelectItem value="general_admin">General Admin</SelectItem>}
                                <SelectItem value="workspace_admin">Workspace Admin</SelectItem>
                                <SelectItem value="member">Workspace User</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${roleCls}`}>
                              {roleText}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-gray-400 text-xs">
                          {u.created_date ? new Date(u.created_date).toLocaleDateString('de-DE') : '–'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>
        )}

        {/* TAB: Pro Workspace */}
        <TabsContent value="workspace">
          <div className="flex gap-4">
            {/* Workspace-Liste links */}
            <div className="w-48 flex-shrink-0 space-y-1">
              {workspaces.map(ws => (
                <button
                  key={ws.id}
                  onClick={() => setSelectedWorkspace(ws)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors
                    ${selectedWorkspace?.id === ws.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Building2 className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{ws.name}</span>
                </button>
              ))}
            </div>

            {/* Mitglieder-Tabelle rechts */}
            <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm">{selectedWorkspace?.name}</h3>
                  <p className="text-xs text-gray-400">{members.length} Mitglieder</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => {
                  setInviteMode('workspace');
                  setInviteWorkspaceId(selectedWorkspace?.id || '');
                  setInviteOpen(true);
                }}>
                  <UserPlus className="w-3 h-3 mr-1" /> Einladen
                </Button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">E-Mail</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Rolle im Workspace</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Status</th>
                    {isGenAdmin && <th className="px-4 py-2.5 text-xs"></th>}
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-sm">
                      <UserPlus className="w-6 h-6 mx-auto mb-1 opacity-30" />Noch keine Mitglieder
                    </td></tr>
                  ) : members.map(m => {
                    const roleCfg = memberRoleLabel[m.role] || memberRoleLabel['member'];
                    return (
                      <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-700">{m.user_email}</td>
                        <td className="px-4 py-2.5">
                          {isGenAdmin ? (
                            <Select value={m.role} onValueChange={val => handleChangeRole(m, val)}>
                              <SelectTrigger className="h-7 text-xs w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="workspace_admin">Admin</SelectItem>
                                <SelectItem value="member">Mitglied</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className={`inline-flex text-xs px-2 py-0.5 rounded-full ${roleCfg.class}`}>{roleCfg.label}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${m.status === 'aktiv' ? 'bg-green-100 text-green-700' : m.status === 'deaktiviert' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {m.status}
                          </span>
                        </td>
                        {isGenAdmin && (
                          <td className="px-4 py-2.5 text-right">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={() => setDeleteTarget(m)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{inviteMode === 'platform' ? 'Plattform-Nutzer anlegen' : 'Workspace-Mitglied einladen'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">E-Mail *</Label>
              <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="mt-1" placeholder="nutzer@firma.de" />
            </div>
            {inviteMode === 'platform' ? (
              <div>
                <Label className="text-xs">Plattform-Rolle</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general_admin">General Admin</SelectItem>
                    <SelectItem value="workspace_admin">Workspace Admin</SelectItem>
                    <SelectItem value="member">Mitglied</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div>
                  <Label className="text-xs">Workspace / Firma</Label>
                  <Select value={inviteWorkspaceId} onValueChange={setInviteWorkspaceId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Workspace wählen..." /></SelectTrigger>
                    <SelectContent>
                      {workspaces.map(ws => (
                        <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Rolle im Workspace</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="workspace_admin">Admin</SelectItem>
                      <SelectItem value="member">Mitglied</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Abbrechen</Button>
            <Button onClick={inviteMode === 'platform' ? handleInvitePlatform : handleInviteWorkspaceMember} disabled={inviting}>
              {inviting ? 'Sende...' : 'Einladung senden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mitglied entfernen?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-gray-600 px-1">{deleteTarget?.user_email} wird aus dem Workspace entfernt.</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} className="bg-red-600 hover:bg-red-700">Entfernen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
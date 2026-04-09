import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/context/RBACContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { FEATURES, FEATURE_LABELS, DEFAULT_ROLE_FEATURES } from '@/lib/rbac';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Shield, Check, X, RefreshCw } from 'lucide-react';

const TARGET_ROLES = [
  { value: 'general_admin', label: 'General Admin', managedBy: ['super_admin', 'admin'] },
  { value: 'workspace_admin', label: 'Workspace Admin', managedBy: ['super_admin', 'admin', 'general_admin'] },
  { value: 'member', label: 'Workspace User', managedBy: ['super_admin', 'admin', 'general_admin', 'workspace_admin'] },
];

export default function Berechtigungen() {
  const { currentUser, role, isSuper, isGenAdmin, featurePermissions, refresh } = useRBAC();
  const { activeWorkspace } = useWorkspace();

  const [permissions, setPermissions] = useState([]);
  const [mandanten, setMandanten] = useState([]);
  const [selectedMandant, setSelectedMandant] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [workspaces, setWorkspaces] = useState([]);
  const [saving, setSaving] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const fps = await base44.entities.FeaturePermission.list();
    setPermissions(fps);
    if (isSuper) {
      const m = await base44.entities.Mandant.list();
      setMandanten(m);
      const w = await base44.entities.Workspace.list();
      setWorkspaces(w);
    } else if (isGenAdmin) {
      const w = await base44.entities.Workspace.list();
      const myWs = w.filter(ws => !currentUser.mandant_id || ws.mandant_id === currentUser.mandant_id);
      setWorkspaces(myWs);
    }
    setLoading(false);
  };

  // Which roles can this user manage?
  const manageableRoles = TARGET_ROLES.filter(r => r.managedBy.includes(role));

  const getPermission = (feature, targetRole) => {
    // Find most specific override
    const matches = permissions.filter(p =>
      p.feature === feature &&
      p.target_role === targetRole &&
      (!selectedMandant || p.mandant_id === selectedMandant || !p.mandant_id) &&
      (!selectedWorkspace || p.workspace_id === selectedWorkspace || !p.workspace_id)
    );
    if (matches.length === 0) {
      // Default: check if feature is in default set for this role
      return DEFAULT_ROLE_FEATURES[targetRole]?.includes(feature) ?? false;
    }
    // Most specific wins
    const withWs = matches.find(p => p.workspace_id === selectedWorkspace);
    const withM = matches.find(p => p.mandant_id === selectedMandant && !p.workspace_id);
    const global = matches.find(p => !p.mandant_id && !p.workspace_id);
    const best = withWs || withM || global;
    return best?.enabled ?? DEFAULT_ROLE_FEATURES[targetRole]?.includes(feature) ?? false;
  };

  const toggleFeature = async (feature, targetRole, currentValue) => {
    setSaving(`${feature}-${targetRole}`);
    const newValue = !currentValue;

    // Find existing permission record
    const existing = permissions.find(p =>
      p.feature === feature &&
      p.target_role === targetRole &&
      (p.mandant_id || '') === (selectedMandant || '') &&
      (p.workspace_id || '') === (selectedWorkspace || '')
    );

    if (existing) {
      await base44.entities.FeaturePermission.update(existing.id, { enabled: newValue, set_by: currentUser?.email });
    } else {
      await base44.entities.FeaturePermission.create({
        feature,
        target_role: targetRole,
        enabled: newValue,
        mandant_id: selectedMandant || '',
        workspace_id: selectedWorkspace || '',
        set_by: currentUser?.email,
      });
    }

    // Log
    await base44.entities.AuditLog.create({
      workspace_id: selectedWorkspace || '',
      entity_type: 'FeaturePermission',
      entity_id: feature,
      action: 'geaendert',
      field_name: feature,
      old_value: String(currentValue),
      new_value: String(newValue),
      user_email: currentUser?.email,
      user_name: currentUser?.full_name || currentUser?.email,
    });

    toast.success(`Feature "${FEATURE_LABELS[feature]}" für ${targetRole} ${newValue ? 'aktiviert' : 'deaktiviert'}`);
    await load();
    refresh();
    setSaving(null);
  };

  if (loading) return <div className="p-6 text-center text-gray-400 py-16">Lade...</div>;

  if (!isGenAdmin) return (
    <div className="p-6 text-center py-16 text-gray-400">
      <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
      <p>Kein Zugriff auf die Feature-Verwaltung.</p>
    </div>
  );

  const filteredWorkspaces = selectedMandant
    ? workspaces.filter(w => w.mandant_id === selectedMandant)
    : workspaces;

  return (
    <div className="p-6">
      <PageHeader
        title="Feature & Berechtigungen"
        subtitle="Aktivieren oder deaktivieren Sie Funktionen für einzelne Rollen"
        actions={
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-1" /> Aktualisieren
          </Button>
        }
      />

      {/* Scope Filter */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex flex-wrap gap-3 items-center">
        <span className="text-xs font-medium text-blue-700">Scope:</span>
        {isSuper && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-600">Mandant:</span>
            <Select value={selectedMandant} onValueChange={v => { setSelectedMandant(v); setSelectedWorkspace(''); }}>
              <SelectTrigger className="h-7 text-xs w-44 bg-white">
                <SelectValue placeholder="Global (alle)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Global (alle)</SelectItem>
                {mandanten.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs text-blue-600">Workspace:</span>
          <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
            <SelectTrigger className="h-7 text-xs w-44 bg-white">
              <SelectValue placeholder="Mandantenweit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Mandantenweit</SelectItem>
              {filteredWorkspaces.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-blue-600 ml-auto">Spezifischere Einstellungen überschreiben globale.</p>
      </div>

      {/* Feature Matrix */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-700">Feature</th>
              {manageableRoles.map(r => (
                <th key={r.value} className="text-center px-4 py-3 font-medium text-gray-700 w-40">{r.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(FEATURE_LABELS).map(([feature, label]) => (
              <tr key={feature} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  <div className="text-sm text-gray-800">{label}</div>
                  <div className="text-xs text-gray-400 font-mono">{feature}</div>
                </td>
                {manageableRoles.map(r => {
                  const enabled = getPermission(feature, r.value);
                  const key = `${feature}-${r.value}`;
                  return (
                    <td key={r.value} className="text-center px-4 py-2.5">
                      <button
                        onClick={() => toggleFeature(feature, r.value, enabled)}
                        disabled={saving === key}
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-all
                          ${enabled
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-red-100 text-red-500 hover:bg-red-200'}
                          ${saving === key ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                      >
                        {enabled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-3">
        Grün = aktiviert · Rot = deaktiviert · Änderungen werden im Audit-Log protokolliert.
      </p>
    </div>
  );
}
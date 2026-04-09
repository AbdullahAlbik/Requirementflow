import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { FolderOpen, Users, FileText, Plus, Settings, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GeneralAdminDashboard({ currentUser }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [members, setMembers] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const [ws, mem, reqs] = await Promise.all([
      base44.entities.Workspace.list('-created_date'),
      base44.entities.WorkspaceMember.list('-created_date'),
      base44.entities.Requirement.list('-created_date', 100),
    ]);
    // Filter to this mandant
    const myWs = ws.filter(w => !currentUser.mandant_id || w.mandant_id === currentUser.mandant_id);
    const myWsIds = myWs.map(w => w.id);
    const myMem = mem.filter(m => myWsIds.includes(m.workspace_id));
    const myReqs = reqs.filter(r => myWsIds.includes(r.workspace_id));
    setWorkspaces(myWs); setMembers(myMem); setRequirements(myReqs);
    setLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-gray-400 py-16">Lade...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-5 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-5 h-5" />
          <span className="text-sm font-medium opacity-80">General Admin – Mandanten-Dashboard</span>
        </div>
        <h1 className="text-2xl font-bold">Willkommen, {currentUser?.full_name || currentUser?.email}</h1>
        <p className="text-purple-100 text-sm mt-1">Sie verwalten Ihr Mandat und alle zugehörigen Workspaces.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Workspaces', value: workspaces.length, icon: FolderOpen, color: 'blue' },
          { label: 'Mitglieder gesamt', value: members.length, icon: Users, color: 'purple' },
          { label: 'Anforderungen', value: requirements.length, icon: FileText, color: 'green' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">{kpi.label}</span>
              <kpi.icon className={`w-4 h-4 text-${kpi.color}-500`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-blue-600" /> Workspaces
            </h2>
            <Link to="/workspaces"><Button size="sm" variant="outline"><Plus className="w-3 h-3 mr-1" /> Verwalten</Button></Link>
          </div>
          <div className="space-y-2">
            {workspaces.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Noch keine Workspaces</p>
            ) : workspaces.map(ws => (
              <div key={ws.id} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                <div>
                  <div className="text-sm font-medium text-gray-800">{ws.name}</div>
                  <div className="text-xs text-gray-400">{members.filter(m => m.workspace_id === ws.id).length} Mitglieder</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${ws.status === 'aktiv' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {ws.status || 'aktiv'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-800 mb-3">Schnellaktionen</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Workspace anlegen', path: '/workspaces', icon: FolderOpen },
              { label: 'Nutzer einladen', path: '/nutzer', icon: Users },
              { label: 'Berechtigungen', path: '/berechtigungen', icon: Shield },
              { label: 'Einstellungen', path: '/einstellungen', icon: Settings },
            ].map(a => (
              <Link key={a.label} to={a.path}>
                <button className="w-full flex items-center gap-2 p-2 text-sm text-gray-700 border border-gray-200 rounded-md hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 transition-colors">
                  <a.icon className="w-4 h-4" /> {a.label}
                </button>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
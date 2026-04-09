import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Building2, Users, FolderOpen, Shield, TrendingUp, AlertCircle, Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SuperAdminDashboard({ currentUser }) {
  const [mandanten, setMandanten] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Mandant.list('-created_date', 50),
      base44.entities.Workspace.list('-created_date', 50),
      base44.entities.User.list('-created_date', 50),
      base44.entities.AuditLog.list('-created_date', 10),
    ]).then(([m, w, u, a]) => {
      setMandanten(m); setWorkspaces(w); setUsers(u); setAuditLogs(a);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-6 text-center text-gray-400 py-16">Lade...</div>;

  const aktiveMandanten = mandanten.filter(m => m.status === 'aktiv');
  const aktiveWorkspaces = workspaces.filter(w => w.status === 'aktiv');

  return (
    <div className="p-6 space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-5 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-6 h-6" />
          <span className="text-sm font-medium opacity-80">Super Admin – System-Dashboard</span>
        </div>
        <h1 className="text-2xl font-bold">Willkommen, {currentUser?.full_name || currentUser?.email}</h1>
        <p className="text-red-100 text-sm mt-1">Sie haben vollständigen Zugriff auf das gesamte System.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Mandanten gesamt', value: mandanten.length, sub: `${aktiveMandanten.length} aktiv`, icon: Building2, color: 'blue' },
          { label: 'Workspaces gesamt', value: workspaces.length, sub: `${aktiveWorkspaces.length} aktiv`, icon: FolderOpen, color: 'green' },
          { label: 'Nutzer gesamt', value: users.length, icon: Users, color: 'purple' },
          { label: 'Inaktive Mandanten', value: mandanten.length - aktiveMandanten.length, icon: AlertCircle, color: 'red' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">{kpi.label}</span>
              <kpi.icon className={`w-4 h-4 text-${kpi.color}-500`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
            {kpi.sub && <div className="text-xs text-gray-400 mt-0.5">{kpi.sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mandanten Overview */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" /> Mandanten
            </h2>
            <Link to="/mandanten">
              <Button size="sm" variant="outline"><Plus className="w-3 h-3 mr-1" /> Verwalten</Button>
            </Link>
          </div>
          <div className="space-y-2">
            {mandanten.slice(0, 6).map(m => (
              <div key={m.id} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                <div>
                  <div className="text-sm font-medium text-gray-800">{m.name}</div>
                  <div className="text-xs text-gray-400 font-mono">{m.key} · {workspaces.filter(w => w.mandant_id === m.id).length} Workspaces</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${m.status === 'aktiv' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {m.status}
                </span>
              </div>
            ))}
            {mandanten.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Noch keine Mandanten</p>}
          </div>
        </div>

        {/* Recent Audit Log */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" /> Letzte Aktivitäten
            </h2>
            <Link to="/audit-log">
              <Button size="sm" variant="outline">Alle</Button>
            </Link>
          </div>
          <div className="space-y-2">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Noch keine Einträge</p>
            ) : auditLogs.map(log => (
              <div key={log.id} className="flex items-start gap-2 py-1.5 border-b border-gray-50">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-700">{log.entity_type} · {log.action}</div>
                  <div className="text-xs text-gray-400">{log.user_email} · {log.created_date ? new Date(log.created_date).toLocaleDateString('de-DE') : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-800 mb-3">Schnellaktionen</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Mandant anlegen', path: '/mandanten', icon: Building2 },
            { label: 'Nutzer verwalten', path: '/nutzer', icon: Users },
            { label: 'Berechtigungen', path: '/berechtigungen', icon: Shield },
            { label: 'Audit-Log', path: '/audit-log', icon: Clock },
          ].map(a => (
            <Link key={a.label} to={a.path}>
              <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors">
                <a.icon className="w-4 h-4" /> {a.label}
              </button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
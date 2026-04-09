import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/context/WorkspaceContext';
import { Link } from 'react-router-dom';
import { FileText, AlertTriangle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';

export default function MemberDashboard({ currentUser }) {
  const { activeWorkspace } = useWorkspace();
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspace) return;
    base44.entities.Requirement.filter({ workspace_id: activeWorkspace.id }).then(r => {
      setRequirements(r);
      setLoading(false);
    });
  }, [activeWorkspace]);

  if (!activeWorkspace) return (
    <div className="p-6 text-center py-16 text-gray-400">
      <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
      <p>Kein Workspace zugewiesen. Bitte wenden Sie sich an Ihren Admin.</p>
    </div>
  );

  if (loading) return <div className="p-6 text-center text-gray-400 py-16">Lade...</div>;

  const myReqs = requirements.filter(r => r.author_email === currentUser?.email);
  const inPruefung = requirements.filter(r => r.status === 'in_pruefung').length;

  return (
    <div className="p-6 space-y-6">
      <div className="bg-gradient-to-r from-gray-700 to-gray-800 rounded-xl p-5 text-white">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-5 h-5" />
          <span className="text-sm font-medium opacity-80">Workspace User – {activeWorkspace.name}</span>
        </div>
        <h1 className="text-2xl font-bold">Willkommen, {currentUser?.full_name || currentUser?.email}</h1>
        <p className="text-gray-300 text-sm mt-1">Workspace: <strong>{activeWorkspace.name}</strong> ({activeWorkspace.key})</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Alle Anforderungen', value: requirements.length, icon: FileText, color: 'blue' },
          { label: 'Meine Anforderungen', value: myReqs.length, icon: FileText, color: 'purple' },
          { label: 'In Prüfung', value: inPruefung, icon: AlertTriangle, color: 'yellow' },
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
            <h2 className="font-semibold text-gray-800">Meine Anforderungen</h2>
            <Link to="/anforderungen"><Button size="sm" variant="outline"><Plus className="w-3 h-3 mr-1" /> Anlegen</Button></Link>
          </div>
          {myReqs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Noch keine eigenen Anforderungen</p>
          ) : (
            <div className="space-y-1">
              {myReqs.slice(0, 5).map(req => (
                <div key={req.id} className="flex items-center gap-2 text-sm py-1">
                  <span className="font-mono text-xs text-gray-400 w-20 flex-shrink-0">{req.uid || req.id.slice(0, 8)}</span>
                  <span className="flex-1 truncate text-gray-700">{req.title}</span>
                  <StatusBadge value={req.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-800 mb-3">Schnellaktionen</h2>
          <div className="grid grid-cols-1 gap-2">
            {[
              { label: 'Anforderung anlegen', path: '/anforderungen', icon: FileText },
              { label: 'Anforderungen ansehen', path: '/anforderungen', icon: FileText },
              { label: 'Reviews einsehen', path: '/reviews', icon: AlertTriangle },
            ].map(a => (
              <Link key={a.label} to={a.path}>
                <button className="w-full flex items-center gap-2 p-2 text-sm text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
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
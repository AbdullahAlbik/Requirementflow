import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/context/WorkspaceContext';
import { Link } from 'react-router-dom';
import { FileText, Users, CheckSquare, AlertTriangle, Plus, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';

export default function WorkspaceAdminDashboard({ currentUser }) {
  const { activeWorkspace } = useWorkspace();
  const [requirements, setRequirements] = useState([]);
  const [members, setMembers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspace) return;
    Promise.all([
      base44.entities.Requirement.filter({ workspace_id: activeWorkspace.id }),
      base44.entities.WorkspaceMember.filter({ workspace_id: activeWorkspace.id }),
      base44.entities.Review.filter({ workspace_id: activeWorkspace.id }),
    ]).then(([r, m, rev]) => {
      setRequirements(r); setMembers(m); setReviews(rev);
      setLoading(false);
    });
  }, [activeWorkspace]);

  if (!activeWorkspace) return (
    <div className="p-6 text-center py-16 text-gray-400">
      <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
      <p>Kein Workspace ausgewählt</p>
    </div>
  );

  if (loading) return <div className="p-6 text-center text-gray-400 py-16">Lade...</div>;

  const freigegeben = requirements.filter(r => r.status === 'freigegeben').length;
  const inPruefung = requirements.filter(r => r.status === 'in_pruefung').length;
  const offeneReviews = reviews.filter(r => r.status === 'geplant' || r.status === 'in_review').length;

  return (
    <div className="p-6 space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-5 h-5" />
          <span className="text-sm font-medium opacity-80">Workspace Admin – {activeWorkspace.name}</span>
        </div>
        <h1 className="text-2xl font-bold">Willkommen, {currentUser?.full_name || currentUser?.email}</h1>
        <p className="text-blue-100 text-sm mt-1">Sie verwalten den Workspace <strong>{activeWorkspace.name}</strong> ({activeWorkspace.key}).</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Anforderungen', value: requirements.length, icon: FileText, color: 'blue' },
          { label: 'Freigegeben', value: freigegeben, icon: CheckSquare, color: 'green' },
          { label: 'In Prüfung', value: inPruefung, icon: AlertTriangle, color: 'yellow' },
          { label: 'Mitglieder', value: members.length, icon: Users, color: 'purple' },
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
              <AlertTriangle className="w-4 h-4 text-orange-500" /> Offene Arbeit
            </h2>
          </div>
          <div className="space-y-2 text-sm">
            <Link to="/anforderungen" className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
              <span className="text-gray-700">Anforderungen in Prüfung</span>
              <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${inPruefung > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-400'}`}>{inPruefung}</span>
            </Link>
            <Link to="/reviews" className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
              <span className="text-gray-700">Offene Reviews</span>
              <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${offeneReviews > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-400'}`}>{offeneReviews}</span>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-800 mb-3">Schnellaktionen</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Anforderung anlegen', path: '/anforderungen', icon: FileText },
              { label: 'Nutzer einladen', path: '/nutzer', icon: Users },
              { label: 'Review erstellen', path: '/reviews', icon: CheckSquare },
            ].map(a => (
              <Link key={a.label} to={a.path}>
                <button className="w-full flex items-center gap-2 p-2 text-sm text-gray-700 border border-gray-200 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors">
                  <a.icon className="w-4 h-4" /> {a.label}
                </button>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Zuletzt geänderte Anforderungen</h2>
            <Link to="/anforderungen"><Button size="sm" variant="outline">Alle</Button></Link>
          </div>
          {requirements.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Keine Anforderungen vorhanden</p>
          ) : (
            <div className="space-y-1">
              {requirements.slice(0, 5).map(req => (
                <div key={req.id} className="flex items-center gap-2 text-sm py-1">
                  <span className="font-mono text-xs text-gray-400 w-24 flex-shrink-0">{req.uid || req.id.slice(0, 8)}</span>
                  <span className="flex-1 truncate text-gray-700">{req.title}</span>
                  <StatusBadge value={req.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
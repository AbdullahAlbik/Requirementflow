import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/context/WorkspaceContext';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Map } from 'lucide-react';

const PRIORITY_COLORS = {
  kritisch: 'bg-red-100 border-red-300 text-red-800',
  hoch: 'bg-orange-100 border-orange-300 text-orange-800',
  mittel: 'bg-blue-100 border-blue-300 text-blue-800',
  niedrig: 'bg-gray-100 border-gray-300 text-gray-600',
};

export default function Roadmap() {
  const { activeWorkspace } = useWorkspace();
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (activeWorkspace) loadData(); }, [activeWorkspace]);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.Requirement.filter({ workspace_id: activeWorkspace.id }, 'release_planned');
    setRequirements(data);
    setLoading(false);
  };

  if (!activeWorkspace) return <div className="p-6 text-gray-400">Bitte Workspace auswählen.</div>;

  // Group by release_planned
  const grouped = requirements.reduce((acc, r) => {
    const key = r.release_planned || r.release_wanted || 'Kein Release';
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const releaseKeys = Object.keys(grouped).sort((a, b) => {
    if (a === 'Kein Release') return 1;
    if (b === 'Kein Release') return -1;
    return a.localeCompare(b);
  });

  const totalReqs = requirements.length;
  const released = requirements.filter(r => r.status === 'freigegeben' || r.status === 'umgesetzt' || r.status === 'abgeschlossen').length;

  return (
    <div className="p-6">
      <PageHeader title="Roadmap" subtitle={`${totalReqs} Anforderungen · ${releaseKeys.length} Releases`} />

      {activeWorkspace.mode === 'produkt' && activeWorkspace.vision && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="text-xs font-semibold text-blue-600 uppercase mb-1">Produktvision</div>
          <p className="text-sm text-blue-800">{activeWorkspace.vision}</p>
        </div>
      )}

      {/* Progress */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Gesamtfortschritt</span>
          <span className="text-sm text-gray-500">{released} / {totalReqs} freigegeben/umgesetzt</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: totalReqs > 0 ? `${(released/totalReqs)*100}%` : '0%' }}></div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Lade...</div>
      ) : releaseKeys.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Map className="w-10 h-10 mx-auto mb-2 opacity-30" />Keine Anforderungen mit Release-Zuordnung
        </div>
      ) : (
        <div className="space-y-6">
          {releaseKeys.map(release => {
            const reqs = grouped[release];
            const done = reqs.filter(r => ['freigegeben','umgesetzt','abgeschlossen'].includes(r.status)).length;
            const pct = reqs.length > 0 ? Math.round((done/reqs.length)*100) : 0;
            return (
              <div key={release} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-800">{release}</span>
                    <span className="text-xs text-gray-400">{reqs.length} Anforderungen</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{done}/{reqs.length} ({pct}%)</span>
                    <div className="w-24 bg-gray-200 rounded-full h-1.5">
                      <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                </div>
                <div className="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                  {reqs.map(req => (
                    <div key={req.id} className={`rounded border p-2.5 text-xs ${PRIORITY_COLORS[req.priority] || 'bg-gray-50 border-gray-200'}`}>
                      <div className="font-mono text-gray-500 mb-0.5">{req.uid}</div>
                      <div className="font-medium text-gray-900 line-clamp-2">{req.title}</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <StatusBadge value={req.status} />
                        <StatusBadge value={req.priority} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
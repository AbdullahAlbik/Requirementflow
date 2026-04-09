import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/context/WorkspaceContext';
import ExportButton from '@/components/shared/ExportButton';
import PageHeader from '@/components/shared/PageHeader';
import KpiCard from '@/components/shared/KpiCard';
import StatusBadge from '@/components/shared/StatusBadge';
import { FileText, Users, Database, CheckSquare, RefreshCw, Layers, BarChart2, GitMerge } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16'];

export default function Berichte() {
  const { activeWorkspace } = useWorkspace();
  const [data, setData] = useState({ requirements: [], stakeholders: [], docSources: [], sysSources: [], reviews: [], changes: [], baselines: [], links: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (activeWorkspace) loadData(); }, [activeWorkspace]);

  const loadData = async () => {
    setLoading(true);
    const [requirements, stakeholders, docSources, sysSources, reviews, changes, baselines, links] = await Promise.all([
      base44.entities.Requirement.filter({ workspace_id: activeWorkspace.id }),
      base44.entities.Stakeholder.filter({ workspace_id: activeWorkspace.id }),
      base44.entities.DocumentSource.filter({ workspace_id: activeWorkspace.id }),
      base44.entities.SystemSource.filter({ workspace_id: activeWorkspace.id }),
      base44.entities.Review.filter({ workspace_id: activeWorkspace.id }),
      base44.entities.ChangeRequest.filter({ workspace_id: activeWorkspace.id }),
      base44.entities.Baseline.filter({ workspace_id: activeWorkspace.id }),
      base44.entities.TraceLink.filter({ workspace_id: activeWorkspace.id }),
    ]);
    setData({ requirements, stakeholders, docSources, sysSources, reviews, changes, baselines, links });
    setLoading(false);
  };

  if (!activeWorkspace) return <div className="p-6 text-gray-400">Bitte Workspace auswählen.</div>;
  if (loading) return <div className="p-6 text-center text-gray-400 py-16">Lade Berichtsdaten...</div>;

  const { requirements, stakeholders, docSources, sysSources, reviews, changes, baselines, links } = data;

  // Status distribution for Anforderungen
  const statusCounts = ['in_bearbeitung','in_pruefung','freigegeben','geaendert','zurueckgewiesen','umgesetzt','getestet','abgeschlossen']
    .map(s => ({ name: s.replace('_', ' '), value: requirements.filter(r => r.status === s).length }))
    .filter(d => d.value > 0);

  // Priority distribution
  const priorityCounts = ['kritisch','hoch','mittel','niedrig']
    .map(p => ({ name: p, value: requirements.filter(r => r.priority === p).length }))
    .filter(d => d.value > 0);

  // Type distribution
  const typeCounts = ['funktional','qualitaet','randbedingung','sonstige']
    .map(t => ({ name: t, value: requirements.filter(r => r.req_type === t).length }))
    .filter(d => d.value > 0);

  // Review state
  const reviewStateCounts = ['offen','in_review','validiert','abgelehnt']
    .map(s => ({ name: s, value: requirements.filter(r => r.review_state === s).length }))
    .filter(d => d.value > 0);

  const freigabeQuote = requirements.length > 0
    ? Math.round((requirements.filter(r => ['freigegeben','umgesetzt','getestet','abgeschlossen'].includes(r.status)).length / requirements.length) * 100)
    : 0;

  return (
    <div className="p-6">
      <PageHeader title="Berichte & Sichten" subtitle={`Workspace: ${activeWorkspace.name}`}
        actions={<ExportButton data={requirements} filename={`anforderungen-${activeWorkspace.key}`} fields={['uid','title','req_type','status','priority','release_planned','tags']} label="Anforderungen exportieren" />}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Anforderungen gesamt" value={requirements.length} icon={FileText} color="blue" />
        <KpiCard title="Stakeholder" value={stakeholders.length} icon={Users} color="purple" />
        <KpiCard title="Reviews" value={reviews.length} icon={CheckSquare} color="green" />
        <KpiCard title="Änderungsanträge" value={changes.length} icon={RefreshCw} color="orange" />
        <KpiCard title="Basislinien" value={baselines.length} icon={Layers} color="gray" />
        <KpiCard title="Trace-Links" value={links.length} icon={GitMerge} color="blue" />
        <KpiCard title="Freigabe-Quote" value={`${freigabeQuote}%`} icon={BarChart2} color="green" sub="freigegeben / umgesetzt / abgeschlossen" />
        <KpiCard title="Quellen gesamt" value={docSources.length + sysSources.length} icon={Database} color="gray" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Anforderungen nach Status</h3>
          {statusCounts.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-sm">Keine Daten</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusCounts} margin={{ top: 5, right: 10, bottom: 30, left: 0 }}>
                <XAxis dataKey="name" angle={-30} textAnchor="end" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Priority Pie */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Anforderungen nach Priorität</h3>
          {priorityCounts.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-sm">Keine Daten</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={priorityCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {priorityCounts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Type distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Anforderungstypen</h3>
          {typeCounts.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-sm">Keine Daten</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={typeCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {typeCounts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Review State */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Review-Status der Anforderungen</h3>
          {reviewStateCounts.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-sm">Keine Daten</div>
          ) : (
            <div className="space-y-2 mt-2">
              {reviewStateCounts.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3">
                  <StatusBadge value={item.name} />
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${(item.value / requirements.length) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-6 text-right">{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary table */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 lg:col-span-2">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Kritische / Hochpriorisierte Anforderungen (Top 10)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-1.5 text-xs font-medium text-gray-500">UID</th>
                  <th className="text-left py-1.5 text-xs font-medium text-gray-500">Titel</th>
                  <th className="text-left py-1.5 text-xs font-medium text-gray-500">Priorität</th>
                  <th className="text-left py-1.5 text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {requirements
                  .filter(r => r.priority === 'kritisch' || r.priority === 'hoch')
                  .slice(0, 10)
                  .map(r => (
                    <tr key={r.id} className="border-b border-gray-50">
                      <td className="py-1.5 font-mono text-xs text-gray-400">{r.uid || '–'}</td>
                      <td className="py-1.5 text-gray-700 max-w-xs truncate">{r.title}</td>
                      <td className="py-1.5"><StatusBadge value={r.priority} /></td>
                      <td className="py-1.5"><StatusBadge value={r.status} /></td>
                    </tr>
                  ))}
                {requirements.filter(r => r.priority === 'kritisch' || r.priority === 'hoch').length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-center text-gray-400 text-xs">Keine kritischen/hohen Anforderungen</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
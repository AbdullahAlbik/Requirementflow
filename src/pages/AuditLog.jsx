import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/context/WorkspaceContext';
import PageHeader from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Clock, FileText, User, Shield } from 'lucide-react';

const ACTION_COLORS = {
  erstellt: 'bg-green-100 text-green-700',
  geaendert: 'bg-blue-100 text-blue-700',
  geloescht: 'bg-red-100 text-red-700',
  status_geaendert: 'bg-yellow-100 text-yellow-700',
  freigegeben: 'bg-teal-100 text-teal-700',
  abgelehnt: 'bg-orange-100 text-orange-700',
};

const ACTION_LABELS = {
  erstellt: 'Erstellt', geaendert: 'Geändert', geloescht: 'Gelöscht',
  status_geaendert: 'Status geändert', freigegeben: 'Freigegeben', abgelehnt: 'Abgelehnt',
};

export default function AuditLog() {
  const { activeWorkspace } = useWorkspace();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('alle');
  const [filterEntity, setFilterEntity] = useState('alle');

  useEffect(() => { if (activeWorkspace) loadData(); }, [activeWorkspace]);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.AuditLog.filter({ workspace_id: activeWorkspace.id }, '-created_date', 200);
    setEntries(data);
    setLoading(false);
  };

  const filtered = entries.filter(e => {
    const matchSearch = !search || e.entity_uid?.toLowerCase().includes(search.toLowerCase()) ||
      e.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      e.user_name?.toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === 'alle' || e.action === filterAction;
    const matchEntity = filterEntity === 'alle' || e.entity_type === filterEntity;
    return matchSearch && matchAction && matchEntity;
  });

  const entityTypes = [...new Set(entries.map(e => e.entity_type).filter(Boolean))];

  if (!activeWorkspace) return <div className="p-6 text-gray-400">Bitte Workspace auswählen.</div>;

  return (
    <div className="p-6">
      <PageHeader title="Audit-Log" subtitle={`${filtered.length} Einträge`} />

      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="UID oder Nutzer suchen..." className="pl-8 h-8 text-sm" />
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Aktion" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Aktionen</SelectItem>
            {Object.entries(ACTION_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterEntity} onValueChange={setFilterEntity}>
          <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="Entität" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Entitäten</SelectItem>
            {entityTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Lade...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Keine Audit-Einträge vorhanden.</p>
          <p className="text-xs mt-1">Einträge werden automatisch bei Änderungen erstellt.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Zeitpunkt</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Nutzer</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Aktion</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Entität</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">UID</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Feld</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Alt → Neu</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Grund</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                    <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(e.created_date).toLocaleString('de-DE')}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1 text-xs text-gray-700">
                      <User className="w-3 h-3 text-gray-400" />
                      {e.user_name || e.user_email || '–'}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ACTION_COLORS[e.action] || 'bg-gray-100 text-gray-600'}`}>
                      {ACTION_LABELS[e.action] || e.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{e.entity_type}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-gray-600">{e.entity_uid || e.entity_id?.slice(0,8)}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{e.field_name || '–'}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600 max-w-xs">
                    {e.old_value || e.new_value ? (
                      <span><span className="text-red-500 line-through">{e.old_value}</span>{e.old_value && e.new_value && ' → '}<span className="text-green-600">{e.new_value}</span></span>
                    ) : '–'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 max-w-xs truncate">{e.change_reason || '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
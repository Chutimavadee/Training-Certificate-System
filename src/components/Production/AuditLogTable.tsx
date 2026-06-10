import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { RefreshCw, ClipboardList, Hourglass } from 'lucide-react';
import { Table, Thead, Tbody, Tr, Th, Td } from '../ui/Table';

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  module: string;
  timestamp: any;
}

export const AuditLogTable: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'audit_logs'),
        orderBy('timestamp', 'desc'),
        limit(30)
      );
      const snap = await getDocs(q);
      const items: AuditLogEntry[] = snap.docs.map(docItem => {
        const d = docItem.data();
        return {
          id: docItem.id,
          userId: d.userId || 'unknown_user',
          action: d.action || '--',
          module: d.module || 'SYSTEM',
          timestamp: d.timestamp
        };
      });
      setLogs(items);
    } catch (err) {
      console.warn("Failed to retrieve audit logs from Firestore:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  return (
    <div id="audit-log-panel" className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col h-full max-h-[500px]">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5 leading-none">
          <ClipboardList className="h-4.5 w-4.5 text-blue-600" />
          <h4 className="text-xs font-black text-slate-850 uppercase tracking-wider">Security & Administrative Audit Logs</h4>
        </div>
        <button
          onClick={fetchAuditLogs}
          className="p-1 cursor-pointer rounded hover:bg-slate-50 text-slate-500 hover:text-slate-850 transition-colors"
          title="Refresh Logs"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center p-12 text-xs font-mono text-slate-450 gap-1.5ClassName">
            <Hourglass className="h-4 w-4 animate-spin text-blue-500" />
            Syncing audit trace logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-slate-400">
            No audit logs captured yet. Try testing a database operation.
          </div>
        ) : (
          <Table id="system-audit-log-table">
            <Thead>
              <Tr>
                <Th>Operating User</Th>
                <Th>Assigned Module</Th>
                <Th>Secured Action Description</Th>
                <Th>ISO Timestamp</Th>
              </Tr>
            </Thead>
            <Tbody>
              {logs.map((log) => {
                let formattedDate = '--';
                if (log.timestamp?.toDate) {
                  formattedDate = log.timestamp.toDate().toLocaleString();
                } else if (log.timestamp) {
                  formattedDate = new Date(log.timestamp).toLocaleString();
                }

                return (
                  <Tr key={log.id}>
                    <Td className="text-xs font-semibold text-slate-700 truncate max-w-[130px]" title={log.userId}>
                      {log.userId}
                    </Td>
                    <Td>
                      <span className="inline-flex px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-100 font-mono text-[9px] uppercase font-bold tracking-wide">
                        {log.module}
                      </span>
                    </Td>
                    <Td className="text-xs text-slate-600 font-medium">
                      {log.action}
                    </Td>
                    <Td className="text-[10px] font-mono text-slate-450">
                      {formattedDate}
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </div>
    </div>
  );
};

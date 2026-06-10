import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { RefreshCw, FileSpreadsheet, Hourglass } from 'lucide-react';
import { Table, Thead, Tbody, Tr, Th, Td } from '../ui/Table';

export interface ExportHistoryLog {
  id: string;
  exportType: string;
  exportedBy: string;
  exportDate: any;
  recordCount: number;
}

export const ReportHistoryTable: React.FC = () => {
  const [logs, setLogs] = useState<ExportHistoryLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExportLogs = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'report_exports'),
        orderBy('exportDate', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      const items: ExportHistoryLog[] = snap.docs.map(docItem => {
        const d = docItem.data();
        return {
          id: docItem.id,
          exportType: d.exportType || 'CSV_DOWNLOAD',
          exportedBy: d.exportedBy || 'unknown',
          exportDate: d.exportDate,
          recordCount: d.recordCount || 0
        };
      });
      setLogs(items);
    } catch (err) {
      console.warn("Failed to retrieve export logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExportLogs();
  }, []);

  return (
    <div id="report-history-panel" className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col h-full">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5 leading-none">
          <FileSpreadsheet className="h-4.5 w-4.5 text-indigo-600" />
          <h4 className="text-xs font-black text-slate-850 uppercase tracking-wider">Report Export History Ledger</h4>
        </div>
        <button
          onClick={fetchExportLogs}
          className="p-1 cursor-pointer rounded hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors"
          title="Refresh History Logs"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-x-auto min-h-[220px]">
        {loading ? (
          <div className="h-full flex items-center justify-center p-12 text-xs font-mono text-slate-400 gap-1.5">
            <Hourglass className="h-4 w-4 animate-spin text-indigo-500" />
            Loading export logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-slate-400">
            No report exports tracked yet. Export a dataset to see it logged.
          </div>
        ) : (
          <Table id="report-history-table">
            <Thead>
              <Tr>
                <Th>Export Module Type</Th>
                <Th>Exported By</Th>
                <Th>Stamp Date</Th>
                <Th>Row Count</Th>
              </Tr>
            </Thead>
            <Tbody>
              {logs.map((log) => {
                let formattedDate = '--';
                if (log.exportDate?.toDate) {
                  formattedDate = log.exportDate.toDate().toLocaleString();
                } else if (log.exportDate) {
                  formattedDate = new Date(log.exportDate).toLocaleString();
                }

                return (
                  <Tr key={log.id}>
                    <Td className="font-bold text-xs text-indigo-800 font-mono">
                      {log.exportType}
                    </Td>
                    <Td className="text-xs text-slate-600 truncate max-w-[140px]">
                      {log.exportedBy}
                    </Td>
                    <Td className="text-[11px] text-slate-450 leading-none">
                      {formattedDate}
                    </Td>
                    <Td className="font-mono text-xs font-bold text-right text-slate-700">
                      {log.recordCount} records
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

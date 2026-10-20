import React, { useState, useEffect } from 'react';
import { SimulationHistoryRecord, SimulationStateSnapshot } from '../types';
import * as api from '../services/api';
import { History, Save, CheckCircle2, RotateCw } from 'lucide-react';

interface HistoryPageProps {
  snapshot: SimulationStateSnapshot | null;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ snapshot }) => {
  const [history, setHistory] = useState<SimulationHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await api.fetchHistory();
      setHistory(res.history || []);
    } catch (e) {
      console.error('Failed to load history', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleSaveCurrent = async () => {
    try {
      await api.saveCurrentRunToHistory();
      setSaveSuccess(true);
      await loadHistory();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      alert(e.message || 'Failed to save to history');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0b0f19] space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-[#111827] border border-[#1f293d] p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">
            <History className="w-4 h-4" />
            Simulation Persistence
          </div>
          <h2 className="text-xl font-bold text-gray-100">Saved Simulation Runs & Benchmarks</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Archived simulation metrics persisted in authoritative SQLite database for evaluation and comparison.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadHistory}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition"
            title="Refresh List"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleSaveCurrent}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition"
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                Saved to DB!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Snapshot Current Run
              </>
            )}
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-[#111827] border border-[#1f293d] rounded-xl overflow-hidden shadow-lg">
        <div className="px-4 py-3 border-b border-[#1f293d] bg-[#0d1322] flex items-center justify-between">
          <span className="font-semibold text-gray-200 text-sm">Archived Runs</span>
          <span className="font-mono text-xs text-gray-400">({history.length} records)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0a0e1a] text-gray-400 border-b border-gray-800 font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Run ID</th>
                <th className="py-2.5 px-4">Topology</th>
                <th className="py-2.5 px-4">Generated</th>
                <th className="py-2.5 px-4">Delivered (PDR)</th>
                <th className="py-2.5 px-4">Drops</th>
                <th className="py-2.5 px-4">Avg Latency</th>
                <th className="py-2.5 px-4">Throughput</th>
                <th className="py-2.5 px-4">Duration</th>
                <th className="py-2.5 px-4">Recorded At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-mono">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    No simulation runs saved in the database yet. Click "Snapshot Current Run" to record.
                  </td>
                </tr>
              ) : (
                history.map((h) => {
                  const pdr =
                    h.packets_generated > 0
                      ? ((h.packets_delivered / h.packets_generated) * 100).toFixed(1)
                      : '0.0';
                  return (
                    <tr key={h.id} className="hover:bg-gray-800/30 transition">
                      <td className="py-2.5 px-4 font-bold text-gray-200">{h.id}</td>
                      <td className="py-2.5 px-4 text-cyan-400 font-semibold">{h.topology_name}</td>
                      <td className="py-2.5 px-4 text-gray-300">{h.packets_generated}</td>
                      <td className="py-2.5 px-4 text-emerald-400">
                        {h.packets_delivered} ({pdr}%)
                      </td>
                      <td className="py-2.5 px-4 text-rose-400">{h.packets_dropped}</td>
                      <td className="py-2.5 px-4 text-purple-400">{h.avg_latency_ms} ms</td>
                      <td className="py-2.5 px-4 text-amber-400">{h.throughput_pps} pps</td>
                      <td className="py-2.5 px-4 text-gray-400">{h.duration_sec}s</td>
                      <td className="py-2.5 px-4 text-gray-500 text-[10px]">{h.created_at}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

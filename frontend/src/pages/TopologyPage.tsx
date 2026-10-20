import React, { useState, useEffect } from 'react';
import { SimulationStateSnapshot, TopologySummary } from '../types';
import * as api from '../services/api';
import {
  GitBranch,
  RefreshCw,
  AlertTriangle,
  XCircle,
  Plus,
  CheckCircle2,
  Cpu,
  Activity
} from 'lucide-react';

interface TopologyPageProps {
  snapshot: SimulationStateSnapshot | null;
  onLoadTopology: (id: string) => Promise<void>;
  onToggleRouterFailure: (id: string) => void;
  onToggleRouterCongestion: (id: string) => void;
  onToggleLinkFailure: (id: string) => void;
  onToggleLinkCongestion: (id: string) => void;
}

export const TopologyPage: React.FC<TopologyPageProps> = ({
  snapshot,
  onLoadTopology,
  onToggleRouterFailure,
  onToggleRouterCongestion,
  onToggleLinkFailure,
  onToggleLinkCongestion,
}) => {
  const [topologies, setTopologies] = useState<TopologySummary[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('small');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.fetchTopologies().then((res) => {
      setTopologies(res.topologies);
    });
  }, []);

  const handleApplyPreset = async () => {
    setLoading(true);
    try {
      await onLoadTopology(selectedPreset);
    } finally {
      setLoading(false);
    }
  };

  const routers = Object.values(snapshot?.routers || {});
  const links = Object.values(snapshot?.links || {});

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0b0f19] space-y-6">
      {/* Header & Presets Picker */}
      <div className="rounded-xl bg-[#111827] border border-[#1f293d] p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">
            <GitBranch className="w-4 h-4" />
            Network Topology Management
          </div>
          <h2 className="text-xl font-bold text-gray-100">Configured Graph & Topologies</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Load deterministic network presets or inspect and tune node and link parameters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedPreset}
            onChange={(e) => setSelectedPreset(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none"
          >
            {topologies.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleApplyPreset}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Load Topology
          </button>
        </div>
      </div>

      {/* Routers Table */}
      <div className="bg-[#111827] border border-[#1f293d] rounded-xl overflow-hidden shadow-lg">
        <div className="px-4 py-3 border-b border-[#1f293d] flex items-center justify-between bg-[#0d1322]">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-gray-200 text-sm">Router Nodes</span>
            <span className="font-mono text-xs text-gray-400">({routers.length} nodes)</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0a0e1a] text-gray-400 border-b border-gray-800 font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-4">ID</th>
                <th className="py-2.5 px-4">Label</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Queue Capacity</th>
                <th className="py-2.5 px-4">Current Queue</th>
                <th className="py-2.5 px-4">Processing Delay</th>
                <th className="py-2.5 px-4">Total Drops</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-mono">
              {routers.map((r) => {
                const isFailed = r.status === 'failed';
                const isCongested = r.status === 'congested';
                return (
                  <tr key={r.id} className="hover:bg-gray-800/30 transition">
                    <td className="py-2.5 px-4 font-bold text-gray-200">{r.id}</td>
                    <td className="py-2.5 px-4 text-gray-400">{r.label}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          isFailed
                            ? 'bg-red-900/60 text-red-300'
                            : isCongested
                            ? 'bg-amber-900/60 text-amber-300'
                            : 'bg-emerald-900/60 text-emerald-300'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-gray-300">{r.queue_capacity} pkts</td>
                    <td className="py-2.5 px-4 text-cyan-400">
                      {r.queue_len} ({r.queue_utilization_pct}%)
                    </td>
                    <td className="py-2.5 px-4 text-gray-300">{r.processing_delay_ms} ms</td>
                    <td className="py-2.5 px-4 text-rose-400">{r.total_dropped}</td>
                    <td className="py-2.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => onToggleRouterCongestion(r.id)}
                        className={`px-2 py-1 rounded text-[10px] transition ${
                          isCongested
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-gray-800 text-gray-400 hover:text-amber-400'
                        }`}
                      >
                        {isCongested ? 'Clear' : 'Congest'}
                      </button>
                      <button
                        onClick={() => onToggleRouterFailure(r.id)}
                        className={`px-2 py-1 rounded text-[10px] transition ${
                          isFailed
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {isFailed ? 'Restore' : 'Fail'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Network Links Table */}
      <div className="bg-[#111827] border border-[#1f293d] rounded-xl overflow-hidden shadow-lg">
        <div className="px-4 py-3 border-b border-[#1f293d] flex items-center justify-between bg-[#0d1322]">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-gray-200 text-sm">Network Links</span>
            <span className="font-mono text-xs text-gray-400">({links.length} connections)</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0a0e1a] text-gray-400 border-b border-gray-800 font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Link ID</th>
                <th className="py-2.5 px-4">Connection</th>
                <th className="py-2.5 px-4">Cost (Weight)</th>
                <th className="py-2.5 px-4">Latency</th>
                <th className="py-2.5 px-4">Bandwidth</th>
                <th className="py-2.5 px-4">In Flight</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-mono">
              {links.map((l) => {
                const isFailed = l.status === 'failed';
                const isCongested = l.status === 'congested';
                return (
                  <tr key={l.id} className="hover:bg-gray-800/30 transition">
                    <td className="py-2.5 px-4 font-bold text-gray-200">{l.id}</td>
                    <td className="py-2.5 px-4 text-cyan-400">
                      {l.source} &harr; {l.target}
                    </td>
                    <td className="py-2.5 px-4 text-gray-300">{l.cost}</td>
                    <td className="py-2.5 px-4 text-gray-300">{l.latency_ms} ms</td>
                    <td className="py-2.5 px-4 text-gray-400">{l.bandwidth_mbps} Mbps</td>
                    <td className="py-2.5 px-4 text-amber-400">{l.in_flight_count} pkts</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          isFailed
                            ? 'bg-red-900/60 text-red-300'
                            : isCongested
                            ? 'bg-amber-900/60 text-amber-300'
                            : 'bg-emerald-900/60 text-emerald-300'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => onToggleLinkCongestion(l.id)}
                        className={`px-2 py-1 rounded text-[10px] transition ${
                          isCongested
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-gray-800 text-gray-400 hover:text-amber-400'
                        }`}
                      >
                        {isCongested ? 'Clear' : 'Congest'}
                      </button>
                      <button
                        onClick={() => onToggleLinkFailure(l.id)}
                        className={`px-2 py-1 rounded text-[10px] transition ${
                          isFailed
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {isFailed ? 'Restore' : 'Sever'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

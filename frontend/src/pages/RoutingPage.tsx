import React, { useState } from 'react';
import { SimulationStateSnapshot, ShortestPathResult } from '../types';
import * as api from '../services/api';
import {
  Share2,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  HelpCircle,
  Play
} from 'lucide-react';

interface RoutingPageProps {
  snapshot: SimulationStateSnapshot | null;
}

export const RoutingPage: React.FC<RoutingPageProps> = ({ snapshot }) => {
  const routers = Object.keys(snapshot?.routers || {});
  const [source, setSource] = useState<string>(routers[0] || 'R1');
  const [destination, setDestination] = useState<string>(routers[routers.length - 1] || 'R5');
  const [result, setResult] = useState<ShortestPathResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);

  const handleCompute = async () => {
    if (!source || !destination) return;
    setLoading(true);
    try {
      const res = await api.calculateDijkstra(source, destination, true);
      setResult(res);
      setSelectedStepIndex(res.trace && res.trace.length > 0 ? 0 : null);
    } catch (e: any) {
      alert(e.message || 'Routing calculation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0b0f19] space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-[#111827] border border-[#1f293d] p-5 shadow-lg">
        <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">
          <Share2 className="w-4 h-4" />
          Dijkstra Shortest-Path Algorithm Explorer
        </div>
        <h2 className="text-xl font-bold text-gray-100">Algorithmic Route Computation & Trace</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Step-by-step min-heap execution trace of Dijkstra's algorithm computed on authoritative backend network graph.
        </p>

        {/* Source & Destination Selector */}
        <div className="mt-4 flex flex-wrap items-center gap-3 pt-3 border-t border-gray-800">
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <span className="font-semibold">Source Node:</span>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 font-mono text-gray-200 focus:outline-none"
            >
              {routers.map((r) => (
                <option key={r} value={r}>
                  {r} {snapshot?.routers[r]?.status === 'failed' ? '(FAILED)' : ''}
                </option>
              ))}
            </select>
          </div>

          <ArrowRight className="w-4 h-4 text-gray-500" />

          <div className="flex items-center gap-2 text-xs text-gray-300">
            <span className="font-semibold">Destination Node:</span>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 font-mono text-gray-200 focus:outline-none"
            >
              {routers.map((r) => (
                <option key={r} value={r}>
                  {r} {snapshot?.routers[r]?.status === 'failed' ? '(FAILED)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCompute}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {loading ? 'Computing...' : 'Run Dijkstra Algorithm'}
          </button>
        </div>
      </div>

      {/* Result Card */}
      {result && (
        <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              {result.is_reachable ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-400" />
              )}
              <span className="font-bold text-gray-100 text-sm">
                {result.is_reachable ? 'Optimal Route Found' : 'Destination Unreachable'}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-gray-400">
                Total Metric Cost: <strong className="text-cyan-400">{result.total_cost}</strong>
              </span>
              <span className="text-gray-400">
                Latency: <strong className="text-purple-400">{result.total_latency_ms} ms</strong>
              </span>
              <span className="text-gray-400">
                Hops: <strong className="text-amber-400">{result.hops}</strong>
              </span>
            </div>
          </div>

          {/* Route Sequence Pills */}
          {result.is_reachable && (
            <div className="flex flex-wrap items-center gap-2 py-2">
              <span className="text-xs text-gray-400 font-semibold mr-2">Computed Route:</span>
              {result.path.map((nodeId, idx) => (
                <React.Fragment key={idx}>
                  <span className="px-3 py-1 rounded-md bg-blue-950/60 border border-blue-500/40 text-blue-300 font-mono font-bold text-xs shadow-sm">
                    {nodeId}
                  </span>
                  {idx < result.path.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step-by-Step Min-Heap Trace */}
      {result && result.trace && result.trace.length > 0 && (
        <div className="bg-[#111827] border border-[#1f293d] rounded-xl overflow-hidden shadow-lg">
          <div className="px-4 py-3 border-b border-[#1f293d] bg-[#0d1322] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-gray-200 text-sm">
                Dijkstra Min-Heap Step-by-Step Execution Trace
              </span>
              <span className="font-mono text-xs text-gray-400">
                ({result.trace.length} algorithmic steps)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0a0e1a] text-gray-400 border-b border-gray-800 font-mono text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Step</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Node Evaluated</th>
                  <th className="py-2.5 px-4">Heap State (cost, node)</th>
                  <th className="py-2.5 px-4">Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-mono">
                {result.trace.map((t) => (
                  <tr key={t.step} className="hover:bg-gray-800/30 transition">
                    <td className="py-2.5 px-4 text-gray-400">#{t.step}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          t.action === 'EXTRACT_MIN'
                            ? 'bg-blue-900/60 text-blue-300'
                            : t.action === 'RELAX_EDGE'
                            ? 'bg-emerald-900/60 text-emerald-300'
                            : t.action === 'REACHED_DEST'
                            ? 'bg-purple-900/60 text-purple-300'
                            : 'bg-gray-800 text-gray-400'
                        }`}
                      >
                        {t.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-bold text-gray-200">
                      {t.current_node || '—'} {t.neighbor ? `&rarr; ${t.neighbor}` : ''}
                    </td>
                    <td className="py-2.5 px-4 text-cyan-400 font-mono text-[11px] truncate max-w-xs">
                      [{t.heap_state.map(([cost, node]) => `(${cost}, ${node})`).join(', ')}]
                    </td>
                    <td className="py-2.5 px-4 text-gray-300 max-w-md">{t.explanation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Academic Complexity Reference */}
      <div className="bg-[#0d1322] border border-[#1f293d] rounded-xl p-4 text-xs text-gray-400 space-y-2 font-mono">
        <div className="text-gray-200 font-bold flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-blue-400" />
          Complexity & Implementation Notes
        </div>
        <p>
          <strong>Time Complexity:</strong> O((V + E) log V), where V is the number of active routers
          and E is the number of active links. The binary min-heap guarantees logarithmic cost
          extract-min and decrease-key relaxation steps.
        </p>
        <p>
          <strong>Space Complexity:</strong> O(V + E) to store adjacency list, distances table,
          visited set, and the priority queue heap.
        </p>
      </div>
    </div>
  );
};

import React from 'react';
import { RouterState, LinkState } from '../../types';
import {
  Cpu,
  Layers,
  AlertTriangle,
  XCircle,
  Activity,
  ArrowRight,
  Info
} from 'lucide-react';

interface InspectorPanelProps {
  selectedNode: RouterState | null;
  selectedLink: LinkState | null;
  onToggleRouterFailure: (id: string) => void;
  onToggleRouterCongestion: (id: string) => void;
  onToggleLinkFailure: (id: string) => void;
  onToggleLinkCongestion: (id: string) => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedNode,
  selectedLink,
  onToggleRouterFailure,
  onToggleRouterCongestion,
  onToggleLinkFailure,
  onToggleLinkCongestion,
}) => {
  if (selectedNode) {
    const isFailed = selectedNode.status === 'failed';
    const isCongested = selectedNode.status === 'congested';
    const pb = selectedNode.priority_breakdown || {};

    return (
      <div className="w-72 bg-[#0d1322] border-l border-[#1f293d] p-3 flex flex-col gap-3 select-none text-xs">
        <div className="flex items-center justify-between border-b border-gray-800 pb-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-400" />
            <span className="font-mono font-bold text-sm text-gray-100">{selectedNode.id}</span>
          </div>
          <span
            className={`font-mono px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
              isFailed
                ? 'bg-red-900/60 text-red-300'
                : isCongested
                ? 'bg-amber-900/60 text-amber-300'
                : 'bg-emerald-900/60 text-emerald-300'
            }`}
          >
            {selectedNode.status}
          </span>
        </div>

        <div className="text-[11px] text-gray-400">{selectedNode.label}</div>

        {/* Queue Info */}
        <div className="bg-[#141b2d] border border-[#1f293d] rounded-lg p-2.5 space-y-1.5">
          <div className="flex justify-between text-gray-400">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-cyan-400" /> Queue Occupancy:
            </span>
            <span className="font-mono text-gray-200">
              {selectedNode.queue_len} / {selectedNode.queue_capacity}
            </span>
          </div>
          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                selectedNode.queue_utilization_pct > 80
                  ? 'bg-red-500'
                  : selectedNode.queue_utilization_pct > 50
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${selectedNode.queue_utilization_pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 pt-1">
            <span>Utilization:</span>
            <span className="font-mono text-cyan-300">{selectedNode.queue_utilization_pct}%</span>
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="bg-[#141b2d] border border-[#1f293d] rounded-lg p-2.5">
          <div className="text-[10px] text-gray-400 font-semibold uppercase mb-1.5">
            Priority Queue Distribution
          </div>
          <div className="grid grid-cols-2 gap-1 text-[11px] font-mono">
            <div className="text-rose-400">Critical: {pb.critical || 0}</div>
            <div className="text-amber-400">High: {pb.high || 0}</div>
            <div className="text-cyan-400">Normal: {pb.normal || 0}</div>
            <div className="text-slate-400">Low: {pb.low || 0}</div>
          </div>
        </div>

        {/* Performance Counters */}
        <div className="bg-[#141b2d] border border-[#1f293d] rounded-lg p-2.5 space-y-1 text-[11px] font-mono">
          <div className="flex justify-between text-gray-400">
            <span>Processing Delay:</span>
            <span className="text-gray-200">{selectedNode.processing_delay_ms} ms</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Policy:</span>
            <span className="text-gray-200 capitalize">{selectedNode.scheduling_policy}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Total Forwarded:</span>
            <span className="text-emerald-400">{selectedNode.total_processed}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Tail Drops:</span>
            <span className="text-rose-400">{selectedNode.total_dropped}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-1.5 pt-1">
          <button
            onClick={() => onToggleRouterCongestion(selectedNode.id)}
            className={`w-full py-1.5 px-3 rounded-lg font-mono text-xs flex items-center justify-center gap-2 border transition ${
              isCongested
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-gray-800 text-gray-300 border-gray-700 hover:text-amber-400'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {isCongested ? 'Clear Congestion' : 'Inject Congestion'}
          </button>

          <button
            onClick={() => onToggleRouterFailure(selectedNode.id)}
            className={`w-full py-1.5 px-3 rounded-lg font-mono text-xs flex items-center justify-center gap-2 border transition ${
              isFailed
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            {isFailed ? 'Restore Router' : 'Simulate Router Failure'}
          </button>
        </div>
      </div>
    );
  }

  if (selectedLink) {
    const isFailed = selectedLink.status === 'failed';
    const isCongested = selectedLink.status === 'congested';

    return (
      <div className="w-72 bg-[#0d1322] border-l border-[#1f293d] p-3 flex flex-col gap-3 select-none text-xs">
        <div className="flex items-center justify-between border-b border-gray-800 pb-2">
          <div className="flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="font-mono font-bold text-gray-100">{selectedLink.id}</span>
          </div>
          <span
            className={`font-mono px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
              isFailed
                ? 'bg-red-900/60 text-red-300'
                : isCongested
                ? 'bg-amber-900/60 text-amber-300'
                : 'bg-emerald-900/60 text-emerald-300'
            }`}
          >
            {selectedLink.status}
          </span>
        </div>

        <div className="flex items-center justify-center gap-2 bg-[#141b2d] border border-[#1f293d] p-2 rounded-lg font-mono text-sm text-gray-200">
          <span>{selectedLink.source}</span>
          <ArrowRight className="w-4 h-4 text-blue-400" />
          <span>{selectedLink.target}</span>
        </div>

        {/* Link Params */}
        <div className="bg-[#141b2d] border border-[#1f293d] rounded-lg p-2.5 space-y-1.5 font-mono text-[11px]">
          <div className="flex justify-between text-gray-400">
            <span>Propagation Latency:</span>
            <span className="text-cyan-300">{selectedLink.latency_ms} ms</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Routing Metric Cost:</span>
            <span className="text-gray-200">{selectedLink.cost}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Bandwidth:</span>
            <span className="text-gray-200">{selectedLink.bandwidth_mbps} Mbps</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>In-Flight Packets:</span>
            <span className="text-amber-400">{selectedLink.in_flight_count}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Link Utilization:</span>
            <span className="text-emerald-400">{selectedLink.utilization_pct}%</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-1.5 pt-1">
          <button
            onClick={() => onToggleLinkCongestion(selectedLink.id)}
            className={`w-full py-1.5 px-3 rounded-lg font-mono text-xs flex items-center justify-center gap-2 border transition ${
              isCongested
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-gray-800 text-gray-300 border-gray-700 hover:text-amber-400'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {isCongested ? 'Clear Congestion' : 'Inject Congestion (4x Latency)'}
          </button>

          <button
            onClick={() => onToggleLinkFailure(selectedLink.id)}
            className={`w-full py-1.5 px-3 rounded-lg font-mono text-xs flex items-center justify-center gap-2 border transition ${
              isFailed
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            {isFailed ? 'Restore Link' : 'Simulate Link Sever/Failure'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 bg-[#0d1322] border-l border-[#1f293d] p-4 flex flex-col justify-center items-center text-center text-gray-400 select-none text-xs">
      <Info className="w-8 h-8 text-blue-500/50 mb-2" />
      <div className="font-semibold text-gray-300 mb-1">Inspector Panel</div>
      <p className="text-[11px] text-gray-500">
        Click any router node or connection link on the canvas to inspect real-time queues, delays, metrics, or inject failures.
      </p>
    </div>
  );
};

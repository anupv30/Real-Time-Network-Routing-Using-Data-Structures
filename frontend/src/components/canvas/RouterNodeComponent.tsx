import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { RouterState } from '../../types';
import { AlertTriangle, XCircle, Cpu, Layers } from 'lucide-react';

interface RouterNodeProps {
  data: {
    router: RouterState;
    isSelected: boolean;
    onToggleFailure: (id: string) => void;
    onToggleCongestion: (id: string) => void;
  };
}

export const RouterNodeComponent: React.FC<RouterNodeProps> = ({ data }) => {
  const { router, isSelected, onToggleFailure, onToggleCongestion } = data;

  const isFailed = router.status === 'failed';
  const isCongested = router.status === 'congested';

  const statusColor = isFailed
    ? 'border-red-500 bg-red-950/40 text-red-400'
    : isCongested
    ? 'border-amber-500 bg-amber-950/40 text-amber-400'
    : 'border-blue-500/50 bg-[#111827] text-gray-200';

  const utilPct = router.queue_utilization_pct || 0;
  const utilBarColor =
    utilPct > 80 ? 'bg-red-500' : utilPct > 50 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div
      className={`min-w-[170px] rounded-xl border-2 transition-all p-3 shadow-xl backdrop-blur-md ${statusColor} ${
        isSelected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0b0f19]' : ''
      }`}
    >
      {/* Node Connection Handles */}
      <Handle type="target" position={Position.Left} className="!bg-cyan-500 !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Right} className="!bg-cyan-500 !w-2.5 !h-2.5" />

      {/* Router Header */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-700/60 pb-1.5 mb-2">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              isFailed ? 'bg-red-500' : isCongested ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
            }`}
          />
          <span className="font-mono font-bold text-xs tracking-wide">{router.id}</span>
        </div>
        <span
          className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold ${
            isFailed
              ? 'bg-red-900/60 text-red-300'
              : isCongested
              ? 'bg-amber-900/60 text-amber-300'
              : 'bg-emerald-900/50 text-emerald-300'
          }`}
        >
          {router.status}
        </span>
      </div>

      {/* Label */}
      <div className="text-[11px] text-gray-400 truncate mb-2">{router.label}</div>

      {/* Queue Utilization Bar */}
      <div className="mb-2">
        <div className="flex justify-between items-center text-[10px] font-mono text-gray-400 mb-0.5">
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3 text-cyan-400" />
            Queue
          </span>
          <span>
            {router.queue_len} / {router.queue_capacity} ({utilPct}%)
          </span>
        </div>
        <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${utilBarColor}`}
            style={{ width: `${Math.min(100, utilPct)}%` }}
          />
        </div>
      </div>

      {/* Processing State */}
      <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 mb-2">
        <span className="flex items-center gap-1">
          <Cpu className="w-3 h-3 text-blue-400" />
          CPU:
        </span>
        <span
          className={
            router.is_processing
              ? 'text-cyan-400 font-semibold animate-pulse'
              : 'text-gray-500'
          }
        >
          {router.is_processing ? 'Processing' : 'Idle'}
        </span>
      </div>

      {/* Quick Interactive Toggles on Node */}
      <div className="flex gap-1.5 mt-2 pt-1.5 border-t border-gray-800">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleCongestion(router.id);
          }}
          title={isCongested ? 'Clear Congestion' : 'Inject Congestion'}
          className={`flex-1 flex items-center justify-center gap-1 text-[10px] py-1 px-1.5 rounded font-mono transition ${
            isCongested
              ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
              : 'bg-gray-800/80 text-gray-400 hover:text-amber-400 hover:bg-gray-700'
          }`}
        >
          <AlertTriangle className="w-2.5 h-2.5" />
          {isCongested ? 'Clear' : 'Congest'}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFailure(router.id);
          }}
          title={isFailed ? 'Restore Router' : 'Fail Router'}
          className={`flex-1 flex items-center justify-center gap-1 text-[10px] py-1 px-1.5 rounded font-mono transition ${
            isFailed
              ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40'
              : 'bg-gray-800/80 text-gray-400 hover:text-red-400 hover:bg-gray-700'
          }`}
        >
          <XCircle className="w-2.5 h-2.5" />
          {isFailed ? 'Restore' : 'Fail'}
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { SimulationMetrics } from '../../types';
import {
  Send,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Gauge,
  Shuffle,
  Layers,
  X
} from 'lucide-react';

interface KpiCardsProps {
  metrics: SimulationMetrics;
  onClose?: () => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ metrics, onClose }) => {
  return (
    <div className="flex shrink-0 items-center gap-2.5 overflow-x-auto p-3 bg-[#0d1322] border-b border-[#1f293d] select-none transition-all">
      {/* Generated */}
      <div className="min-w-[145px] flex-1 bg-[#141b2d] border border-[#1f293d] rounded-lg p-2.5 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-gray-400 font-medium">Generated</div>
          <div className="text-base font-mono font-bold text-gray-100">{metrics.total_generated}</div>
        </div>
        <Send className="w-4 h-4 text-blue-400" />
      </div>

      {/* Delivered */}
      <div className="min-w-[145px] flex-1 bg-[#141b2d] border border-[#1f293d] rounded-lg p-2.5 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-gray-400 font-medium">Delivered (PDR)</div>
          <div className="text-base font-mono font-bold text-emerald-400">
            {metrics.total_delivered}{' '}
            <span className="text-[11px] font-normal text-emerald-500/80">({metrics.delivery_ratio}%)</span>
          </div>
        </div>
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      </div>

      {/* Dropped */}
      <div className="min-w-[145px] flex-1 bg-[#141b2d] border border-[#1f293d] rounded-lg p-2.5 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-gray-400 font-medium">Dropped (Loss)</div>
          <div className="text-base font-mono font-bold text-rose-400">
            {metrics.total_dropped}{' '}
            <span className="text-[11px] font-normal text-rose-500/80">({metrics.loss_ratio}%)</span>
          </div>
        </div>
        <AlertOctagon className="w-4 h-4 text-rose-400" />
      </div>

      {/* In Transit / Queued */}
      <div className="min-w-[145px] flex-1 bg-[#141b2d] border border-[#1f293d] rounded-lg p-2.5 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-gray-400 font-medium">Transit / Queued</div>
          <div className="text-base font-mono font-bold text-cyan-400">
            {metrics.in_transit} <span className="text-gray-400">/</span> {metrics.queued}
          </div>
        </div>
        <Layers className="w-4 h-4 text-cyan-400" />
      </div>

      {/* Throughput */}
      <div className="min-w-[145px] flex-1 bg-[#141b2d] border border-[#1f293d] rounded-lg p-2.5 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-gray-400 font-medium">Throughput</div>
          <div className="text-base font-mono font-bold text-amber-400">
            {metrics.throughput_pps} <span className="text-[10px] font-normal text-gray-400">pps</span>
          </div>
        </div>
        <Gauge className="w-4 h-4 text-amber-400" />
      </div>

      {/* Avg Latency */}
      <div className="min-w-[145px] flex-1 bg-[#141b2d] border border-[#1f293d] rounded-lg p-2.5 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-gray-400 font-medium">Avg Latency</div>
          <div className="text-base font-mono font-bold text-purple-400">
            {metrics.avg_latency_ms !== null ? `${metrics.avg_latency_ms}ms` : '—'}
          </div>
        </div>
        <Clock className="w-4 h-4 text-purple-400" />
      </div>

      {/* Reroutes */}
      <div className="min-w-[145px] flex-1 bg-[#141b2d] border border-[#1f293d] rounded-lg p-2.5 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-gray-400 font-medium">Reroutes</div>
          <div className="text-base font-mono font-bold text-indigo-400">{metrics.total_reroutes}</div>
        </div>
        <Shuffle className="w-4 h-4 text-indigo-400" />
      </div>

      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          title="Close Metrics cards (can reopen from layout dock)"
          className="shrink-0 p-1.5 self-center text-gray-500 hover:text-gray-200 hover:bg-[#1a2234] rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

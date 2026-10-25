import React, { useState, useEffect } from 'react';
import { SimulationStateSnapshot, RouterState, PacketPriority } from '../types';
import {
  Layers,
  Cpu,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { LivePacketQueueVisualizer } from '../components/queue/LivePacketQueueVisualizer';
import { PacketBurstSection } from '../components/controls/PacketBurstSection';
import * as api from '../services/api';

interface QueueMonitorPageProps {
  snapshot: SimulationStateSnapshot | null;
  selectedRouterId?: string;
  onSelectRouter?: (id: string) => void;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onStep?: () => void;
  onReset?: () => void;
  onInjectPacket?: (source: string, destination: string, priority: PacketPriority) => Promise<any>;
  onInjectBurst?: (source: string, destination: string, count: number, priority?: PacketPriority) => Promise<any>;
  onSetRouterSchedulingPolicy?: (routerId: string, policy: 'fifo' | 'priority') => Promise<void>;
  onConfigChange?: (config: any) => void;
}

export const QueueMonitorPage: React.FC<QueueMonitorPageProps> = ({
  snapshot,
  selectedRouterId: propSelectedRouterId,
  onSelectRouter,
  onStart,
  onPause,
  onResume,
  onStep,
  onReset,
  onInjectPacket,
  onInjectBurst,
  onSetRouterSchedulingPolicy,
  onConfigChange,
}) => {
  const routers = Object.values(snapshot?.routers || {});
  const routerList = Object.keys(snapshot?.routers || {});

  const [localSelectedRouterId, setLocalSelectedRouterId] = useState<string>(
    propSelectedRouterId || routers[0]?.id || 'R1'
  );
  const [destinationRouter, setDestinationRouter] = useState<string>('R5');

  // Keep synced with external selection
  useEffect(() => {
    if (propSelectedRouterId && propSelectedRouterId !== localSelectedRouterId) {
      setLocalSelectedRouterId(propSelectedRouterId);
    }
  }, [propSelectedRouterId]);

  const selectedRouterId = localSelectedRouterId || routers[0]?.id || 'R1';
  const selectedRouter: RouterState | undefined = snapshot?.routers[selectedRouterId];
  const inTransit = snapshot?.in_transit || [];

  const handleSelectRouter = (id: string) => {
    setLocalSelectedRouterId(id);
    onSelectRouter?.(id);
  };

  // Burst injection handler
  const handleBurst = async (source: string, destination: string, count: number, priority: PacketPriority) => {
    if (onInjectBurst) {
      return await onInjectBurst(source, destination, count, priority);
    }
    return await api.injectPacketBurst({ source, destination, count, priority });
  };

  // Sequential test sequence handler: Low -> Normal -> High -> Critical
  const handleSequence = async (source: string, destination: string) => {
    const priorities: PacketPriority[] = ['low', 'normal', 'high', 'critical'];
    for (const p of priorities) {
      if (onInjectPacket) {
        await onInjectPacket(source, destination, p);
      } else {
        await api.injectPacket({ source, destination, priority: p });
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0b0f19] space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-[#111827] border border-[#1f293d] p-5 shadow-lg">
        <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">
          <Layers className="w-4 h-4" />
          Router Packet Queue & Buffer Inspection
        </div>
        <h2 className="text-xl font-bold text-gray-100">Queue Utilization & Scheduling Monitor</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Real-time per-router packet queues, priority heap breakdown, tail-drop overflow accounting, and CPU processing state.
        </p>
      </div>

      {/* Grid of Router Queues */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {routers.map((r) => {
          const isSelected = r.id === selectedRouterId;
          const pb = r.priority_breakdown || {};
          const isFull = r.queue_len >= r.queue_capacity;
          const packetsOnLinks = inTransit.filter(
            (packet) => packet.source === r.id || packet.target === r.id
          ).length;

          return (
            <div
              key={r.id}
              onClick={() => handleSelectRouter(r.id)}
              className={`rounded-xl border p-4 cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-950/20 ring-1 ring-blue-500 shadow-xl'
                  : 'border-[#1f293d] bg-[#111827] hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      r.status === 'failed'
                        ? 'bg-red-500'
                        : r.status === 'congested'
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                  />
                  <span className="font-mono font-bold text-sm text-gray-100">{r.id}</span>
                  <span className="text-xs text-gray-400 truncate max-w-[120px]">({r.label})</span>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                    isFull
                      ? 'bg-rose-900/60 text-rose-300'
                      : r.queue_utilization_pct > 60
                      ? 'bg-amber-900/60 text-amber-300'
                      : 'bg-emerald-900/50 text-emerald-300'
                  }`}
                >
                  {r.queue_len} / {r.queue_capacity}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-[11px] font-mono text-gray-400">
                  <span>Occupancy:</span>
                  <span className="font-bold text-gray-200">{r.queue_utilization_pct}%</span>
                </div>
                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      r.queue_utilization_pct > 80
                        ? 'bg-red-500'
                        : r.queue_utilization_pct > 50
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, r.queue_utilization_pct)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3 rounded-lg bg-[#0d1322] border border-gray-800 px-2 py-2 text-[10px] font-mono">
                <div>
                  <div className="text-gray-500">CPU</div>
                  <div className={r.is_processing ? 'text-cyan-300 font-semibold' : 'text-gray-400'}>
                    {r.is_processing ? 'Processing' : 'Idle'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">On links</div>
                  <div className="text-blue-300 font-semibold">{packetsOnLinks}</div>
                </div>
                <div>
                  <div className="text-gray-500">Processed</div>
                  <div className="text-emerald-300 font-semibold">{r.total_processed}</div>
                </div>
              </div>

              {/* Priority Breakdown mini badges */}
              <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-center pt-2 border-t border-gray-800/80">
                <div className="bg-rose-950/40 border border-rose-900/50 rounded p-1 text-rose-300">
                  <div className="text-[9px] text-gray-400">CRIT</div>
                  <div className="font-bold">{pb.critical || 0}</div>
                </div>
                <div className="bg-amber-950/40 border border-amber-900/50 rounded p-1 text-amber-300">
                  <div className="text-[9px] text-gray-400">HIGH</div>
                  <div className="font-bold">{pb.high || 0}</div>
                </div>
                <div className="bg-cyan-950/40 border border-cyan-900/50 rounded p-1 text-cyan-300">
                  <div className="text-[9px] text-gray-400">NORM</div>
                  <div className="font-bold">{pb.normal || 0}</div>
                </div>
                <div className="bg-slate-900/40 border border-slate-800 rounded p-1 text-slate-300">
                  <div className="text-[9px] text-gray-400">LOW</div>
                  <div className="font-bold">{pb.low || 0}</div>
                </div>
              </div>

              {/* Tail Drop counter */}
              <div className="mt-3 flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-800">
                <span className="flex items-center gap-1 text-rose-400">
                  <ShieldAlert className="w-3.5 h-3.5" /> Tail Drops:
                </span>
                <span className="font-mono font-bold text-rose-400">{r.total_dropped}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Router Detailed Inspection */}
      {selectedRouter && (
        <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <span className="font-bold text-base text-gray-100">
                Queue Deep Dive: Router {selectedRouter.id} ({selectedRouter.label})
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-gray-400">Policy:</span>
              <span className="text-blue-400 font-semibold uppercase">{selectedRouter.scheduling_policy}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
            <div className="bg-[#141b2d] border border-[#1f293d] rounded-lg p-3">
              <div className="text-gray-400 text-[10px] mb-1">Queue Buffer Capacity</div>
              <div className="text-lg font-bold text-gray-100">{selectedRouter.queue_capacity} packets</div>
              <div className="text-gray-500 text-[10px] mt-1">Configured maximum size</div>
            </div>

            <div className="bg-[#141b2d] border border-[#1f293d] rounded-lg p-3">
              <div className="text-gray-400 text-[10px] mb-1">Packets Currently Waiting</div>
              <div className="text-lg font-bold text-cyan-400">{selectedRouter.queue_len} packets</div>
              <div className="text-gray-500 text-[10px] mt-1">{selectedRouter.queue_utilization_pct}% occupied</div>
            </div>

            <div className="bg-[#141b2d] border border-[#1f293d] rounded-lg p-3">
              <div className="text-gray-400 text-[10px] mb-1">Processing Delay per Packet</div>
              <div className="text-lg font-bold text-purple-400">{selectedRouter.processing_delay_ms} ms</div>
              <div className="text-gray-500 text-[10px] mt-1">
                State: {selectedRouter.is_processing ? 'CPU Active' : 'CPU Idle'}
              </div>
            </div>

            <div className="bg-[#141b2d] border border-[#1f293d] rounded-lg p-3">
              <div className="text-gray-400 text-[10px] mb-1">Total Packets Dropped (Tail Drop)</div>
              <div className="text-lg font-bold text-rose-400">{selectedRouter.total_dropped} packets</div>
              <div className="text-gray-500 text-[10px] mt-1">Due to queue overflow</div>
            </div>
          </div>
        </div>
      )}

      {/* LIVE PACKET QUEUE VISUALIZER (Placed below Queue Deep Dive) */}
      {selectedRouter && (
        <LivePacketQueueVisualizer
          router={selectedRouter}
          simState={snapshot?.state || 'stopped'}
          simTimeMs={snapshot?.sim_time_ms || 0}
          onStart={onStart}
          onPause={onPause}
          onResume={onResume}
          onStep={onStep}
          onReset={onReset}
          onSetRouterSchedulingPolicy={onSetRouterSchedulingPolicy}
        />
      )}

      {/* Packet Burst & Test Sequence Injection Section */}
      {selectedRouter && (
        <PacketBurstSection
          sourceRouter={selectedRouter.id}
          destinationRouter={destinationRouter}
          routerList={routerList}
          isStoppedOrPaused={snapshot?.state !== 'running'}
          onInjectBurst={handleBurst}
          onInjectSequence={handleSequence}
          onSourceChange={handleSelectRouter}
          onDestinationChange={setDestinationRouter}
        />
      )}
    </div>
  );
};

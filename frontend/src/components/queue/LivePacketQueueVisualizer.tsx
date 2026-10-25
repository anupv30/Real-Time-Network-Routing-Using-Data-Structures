import React, { useState } from 'react';
import {
  RouterState,
  QueuedPacketInfo,
  ProcessingPacketInfo,
  PacketPriority
} from '../../types';
import {
  Cpu,
  Layers,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Clock,
  Sparkles,
  AlertTriangle,
  Info,
  Sliders,
  CheckCircle2,
  Inbox
} from 'lucide-react';

interface LivePacketQueueVisualizerProps {
  router: RouterState;
  simState: 'stopped' | 'running' | 'paused';
  simTimeMs?: number;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onStep?: () => void;
  onReset?: () => void;
  onSetRouterSchedulingPolicy?: (routerId: string, policy: 'fifo' | 'priority') => Promise<void>;
}

export const LivePacketQueueVisualizer: React.FC<LivePacketQueueVisualizerProps> = ({
  router,
  simState,
  simTimeMs = 0,
  onStart,
  onPause,
  onResume,
  onStep,
  onReset,
  onSetRouterSchedulingPolicy,
}) => {
  const [policySwitchError, setPolicySwitchError] = useState<string | null>(null);
  const [switchingPolicy, setSwitchingPolicy] = useState(false);

  const capacity = Math.max(1, router.queue_capacity || 10);
  const queuedPackets: QueuedPacketInfo[] = router.queued_packets || [];
  const processingPacket: ProcessingPacketInfo | null = router.processing_packet || null;
  const isFull = router.queue_len >= capacity;
  const isFailed = router.status === 'failed';
  const isPriorityPolicy = router.scheduling_policy.toLowerCase() === 'priority';

  const handlePolicyToggle = async (targetPolicy: 'fifo' | 'priority') => {
    if (router.scheduling_policy === targetPolicy || !onSetRouterSchedulingPolicy) return;
    if (router.queue_len > 0 || router.is_processing) {
      setPolicySwitchError('Cannot switch scheduling policy while packets are queued or processing. Reset or step simulation first.');
      setTimeout(() => setPolicySwitchError(null), 4000);
      return;
    }
    try {
      setSwitchingPolicy(true);
      setPolicySwitchError(null);
      await onSetRouterSchedulingPolicy(router.id, targetPolicy);
    } catch (e: any) {
      setPolicySwitchError(e.message || 'Failed to update scheduling policy');
      setTimeout(() => setPolicySwitchError(null), 4000);
    } finally {
      setSwitchingPolicy(false);
    }
  };

  const getPriorityStyle = (priority: PacketPriority) => {
    switch (priority) {
      case 'critical':
        return {
          bg: 'bg-rose-950/80 border-rose-500/80 text-rose-200 shadow-rose-900/30',
          badge: 'bg-rose-500 text-rose-950 font-black',
          dot: 'bg-rose-400',
          ring: 'ring-rose-500/40',
          text: 'CRITICAL',
        };
      case 'high':
        return {
          bg: 'bg-amber-950/80 border-amber-500/80 text-amber-200 shadow-amber-900/30',
          badge: 'bg-amber-500 text-amber-950 font-black',
          dot: 'bg-amber-400',
          ring: 'ring-amber-500/40',
          text: 'HIGH',
        };
      case 'normal':
        return {
          bg: 'bg-cyan-950/80 border-cyan-500/80 text-cyan-200 shadow-cyan-900/30',
          badge: 'bg-cyan-500 text-cyan-950 font-black',
          dot: 'bg-cyan-400',
          ring: 'ring-cyan-500/40',
          text: 'NORMAL',
        };
      case 'low':
      default:
        return {
          bg: 'bg-slate-900/80 border-slate-600/80 text-slate-300 shadow-slate-900/30',
          badge: 'bg-slate-500 text-slate-950 font-black',
          dot: 'bg-slate-400',
          ring: 'ring-slate-500/40',
          text: 'LOW',
        };
    }
  };

  return (
    <div className="rounded-xl bg-[#111827] border border-[#1f293d] p-5 shadow-xl space-y-5">
      {/* Visualizer Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>Interactive Data Structure Animation</span>
          </div>
          <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
            LIVE PACKET QUEUE VISUALIZER
            <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400">
              Router {router.id} ({router.label})
            </span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Real-time packet slot buffers, logical dequeue order ({router.scheduling_policy.toUpperCase()}), CPU processing indicator, and tail-drop overflow.
          </p>
        </div>

        {/* Quick Simulation Playback Controls */}
        <div className="flex items-center gap-2 bg-[#0d1322] border border-gray-800 p-1.5 rounded-lg">
          {simState === 'running' ? (
            <button
              onClick={onPause}
              title="Pause Simulation"
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-medium transition"
            >
              <Pause className="w-3.5 h-3.5" /> Pause
            </button>
          ) : simState === 'paused' ? (
            <button
              onClick={onResume}
              title="Resume Simulation"
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-medium transition"
            >
              <Play className="w-3.5 h-3.5" /> Resume
            </button>
          ) : (
            <button
              onClick={onStart}
              title="Start Simulation"
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-medium transition"
            >
              <Play className="w-3.5 h-3.5" /> Start
            </button>
          )}

          <button
            onClick={onStep}
            title="Advance single tick (50ms)"
            className="flex items-center gap-1 px-2 py-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 text-xs transition"
          >
            <SkipForward className="w-3.5 h-3.5" /> Step 50ms
          </button>

          {onReset && (
            <button
              onClick={onReset}
              title="Reset Simulation State & Counters"
              className="flex items-center gap-1 px-2 py-1 rounded bg-gray-800 text-gray-300 hover:bg-rose-950/50 hover:text-rose-300 border border-gray-700 text-xs transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Policy Selector & Algorithm Details */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#0d1322] border border-gray-800 p-3 rounded-lg text-xs">
        <div className="flex items-center gap-3">
          <span className="font-mono text-gray-400 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-blue-400" /> Scheduling Policy:
          </span>
          <div className="inline-flex rounded-lg border border-gray-700 bg-gray-900 p-0.5 font-mono">
            <button
              onClick={() => handlePolicyToggle('fifo')}
              disabled={switchingPolicy || !onSetRouterSchedulingPolicy}
              className={`px-3 py-1 rounded text-xs font-bold uppercase transition ${
                !isPriorityPolicy
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              FIFO
            </button>
            <button
              onClick={() => handlePolicyToggle('priority')}
              disabled={switchingPolicy || !onSetRouterSchedulingPolicy}
              className={`px-3 py-1 rounded text-xs font-bold uppercase transition ${
                isPriorityPolicy
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Priority Queue (Min-Heap)
            </button>
          </div>
        </div>

        {/* Policy Explanation Banner */}
        <div className="text-[11px] text-gray-400 max-w-xl">
          {isPriorityPolicy ? (
            <span className="text-purple-300">
              <span className="font-semibold text-purple-200">Priority Queue Mode:</span> Logical dequeue order ordered by priority
              (Critical &gt; High &gt; Normal &gt; Low) with FIFO tie-breaking on arrival time. FRONT slot is dequeued first.
            </span>
          ) : (
            <span className="text-blue-300">
              <span className="font-semibold text-blue-200">FIFO Mode:</span> Strict First-In, First-Out arrival order. Packets enter at REAR and leave from FRONT.
            </span>
          )}
        </div>
      </div>

      {policySwitchError && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-950/40 border border-amber-800 text-amber-300 text-xs font-mono">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{policySwitchError}</span>
        </div>
      )}

      {/* Main Queue & Processing Animation Stage */}
      <div className="space-y-4">
        {/* Direction Flow Header */}
        <div className="flex items-center justify-between text-xs font-mono">
          {/* Output / Dequeue Direction */}
          <div className="flex items-center gap-2 text-cyan-400 bg-cyan-950/30 border border-cyan-800/50 px-3 py-1.5 rounded-lg">
            <ArrowLeft className="w-4 h-4 animate-pulse" />
            <span className="font-bold">FRONT / NEXT TO PROCESS</span>
            <span className="text-[10px] text-cyan-300/70">(Slot #1 leaves next)</span>
          </div>

          {/* Queue Capacity Meter */}
          <div className="flex items-center gap-3 bg-[#0d1322] border border-gray-800 px-3 py-1.5 rounded-lg text-gray-300">
            <span>Buffer Occupancy:</span>
            <span className={`font-bold ${isFull ? 'text-rose-400' : 'text-cyan-400'}`}>
              {router.queue_len} / {capacity} slots ({router.queue_utilization_pct}%)
            </span>
          </div>

          {/* Input / Arrival Direction */}
          <div className="flex items-center gap-2 text-amber-400 bg-amber-950/30 border border-amber-800/50 px-3 py-1.5 rounded-lg">
            <span className="text-[10px] text-amber-300/70">(New packets enter here)</span>
            <span className="font-bold">REAR / NEW ARRIVALS</span>
            <ArrowLeft className="w-4 h-4" />
          </div>
        </div>

        {/* Overflow / Full Alert */}
        {isFull && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-rose-950/80 via-red-950/60 to-rose-950/80 border border-rose-500/80 text-rose-200 animate-pulse shadow-lg">
            <div className="flex items-center gap-2 text-xs font-bold font-mono">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>QUEUE FULL (100% UTILIZATION REACHED)</span>
              <span className="font-normal text-rose-300">
                — Tail Drop policy active. Any new arrivals will be immediately dropped!
              </span>
            </div>
            <div className="font-mono text-xs px-2.5 py-1 rounded bg-rose-900/80 text-rose-100 font-bold border border-rose-400/40">
              Tail Drops: {router.total_dropped}
            </div>
          </div>
        )}

        {/* Visualizer Canvas Row: CPU Processing Area + Queue Buffer Slots */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
          {/* 1. CPU Processing Area (Cols 1-3) */}
          <div className="xl:col-span-3 flex flex-col justify-between rounded-xl bg-[#0d1322] border border-gray-800 p-4 relative overflow-hidden shadow-inner">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Cpu className={`w-4 h-4 ${router.is_processing && !isFailed ? 'text-cyan-400 animate-spin' : 'text-gray-500'}`} />
                <span className="font-mono font-bold text-xs uppercase tracking-wider text-gray-200">
                  CURRENTLY PROCESSING
                </span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  isFailed
                    ? 'bg-rose-900/60 text-rose-300'
                    : router.is_processing
                    ? 'bg-cyan-900/60 text-cyan-300 animate-pulse'
                    : 'bg-gray-800 text-gray-400'
                }`}
              >
                {isFailed ? 'Offline' : router.is_processing ? 'CPU Active' : 'CPU Idle'}
              </span>
            </div>

            {isFailed ? (
              <div className="my-auto py-6 text-center space-y-2">
                <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
                <div className="text-xs font-bold text-rose-300">Router {router.id} Offline / Failed</div>
                <p className="text-[11px] text-gray-400">
                  Processing halted. All queued packets were dropped on failure.
                </p>
              </div>
            ) : router.is_processing && processingPacket ? (
              <div className="space-y-3 my-auto">
                {/* Active packet info */}
                <div
                  className={`p-3 rounded-lg border shadow-lg transition-all ${
                    getPriorityStyle(processingPacket.priority).bg
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-black text-sm tracking-wider text-white">
                      {processingPacket.id}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-black px-2 py-0.5 rounded uppercase ${
                        getPriorityStyle(processingPacket.priority).badge
                      }`}
                    >
                      {processingPacket.priority}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-gray-300 pt-1 border-t border-white/10">
                    <span>Route:</span>
                    <span className="font-bold text-white">
                      {processingPacket.source} ➔ {processingPacket.destination}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-gray-400">
                    <span>CPU Progress:</span>
                    <span className="text-cyan-300 font-bold">
                      {Math.round(processingPacket.progress * 100)}% ({processingPacket.remaining_ms}ms left)
                    </span>
                  </div>
                  <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden border border-gray-800">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-100 ease-linear"
                      style={{ width: `${Math.min(100, Math.max(5, processingPacket.progress * 100))}%` }}
                    />
                  </div>
                </div>

                <div className="text-[10px] font-mono text-gray-400 flex items-center justify-between pt-1">
                  <span>Processing Delay:</span>
                  <span className="text-purple-300 font-semibold">{router.processing_delay_ms} ms</span>
                </div>
              </div>
            ) : (
              <div className="my-auto py-6 text-center space-y-2 text-gray-500">
                <Inbox className="w-8 h-8 text-gray-600 mx-auto" />
                <div className="text-xs font-mono font-medium text-gray-400">CPU Idle</div>
                <p className="text-[11px] text-gray-500">
                  {router.queue_len > 0
                    ? 'Waiting for simulation start / step to process next packet from Front of queue.'
                    : 'Queue is empty. Inject packets or start Auto Generator to begin.'}
                </p>
              </div>
            )}

            <div className="border-t border-gray-800 pt-2 text-[10px] font-mono text-gray-400 flex items-center justify-between">
              <span>Total Processed:</span>
              <span className="text-emerald-400 font-bold">{router.total_processed} pkts</span>
            </div>
          </div>

          {/* 2. Queue Buffer Slots Strip (Cols 4-12) */}
          <div className="xl:col-span-9 rounded-xl bg-[#0d1322] border border-gray-800 p-4 flex flex-col justify-between shadow-inner">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span className="font-mono font-bold text-xs uppercase tracking-wider text-gray-200">
                  ROUTER QUEUE BUFFER ({capacity} SLOTS)
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Occupied: {queuedPackets.length}</span>
                <span className="mx-1">|</span>
                <span className="w-2 h-2 rounded-full bg-gray-600" />
                <span>Available: {Math.max(0, capacity - queuedPackets.length)}</span>
              </div>
            </div>

            {/* Individual Slot Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 overflow-y-auto max-h-[380px] p-1">
              {Array.from({ length: capacity }).map((_, index) => {
                const packet = queuedPackets[index];
                const isOccupied = !!packet;
                const isFront = index === 0;
                const isRear = isOccupied && index === queuedPackets.length - 1;

                if (isOccupied) {
                  const style = getPriorityStyle(packet.priority);
                  return (
                    <div
                      key={packet.id}
                      className={`relative flex flex-col justify-between p-2.5 rounded-lg border transition-all duration-200 shadow-md ${style.bg} ${
                        isFront ? 'ring-2 ring-cyan-400/60 shadow-cyan-900/40' : ''
                      }`}
                    >
                      {/* Slot position badge & front/rear tag */}
                      <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                        <span className="font-bold text-gray-300">Slot #{index + 1}</span>
                        {isFront && (
                          <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-bold border border-cyan-500/40">
                            FRONT
                          </span>
                        )}
                        {!isFront && isRear && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/40">
                            REAR
                          </span>
                        )}
                      </div>

                      {/* Packet ID */}
                      <div className="font-mono font-bold text-xs truncate text-white" title={packet.id}>
                        {packet.id}
                      </div>

                      {/* Priority Tag */}
                      <div className="my-1.5">
                        <span
                          className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded uppercase ${style.badge}`}
                        >
                          {style.text}
                        </span>
                      </div>

                      {/* Route Info */}
                      <div className="text-[10px] font-mono text-gray-300 pt-1 border-t border-white/10 flex items-center justify-between">
                        <span className="text-gray-400">Path:</span>
                        <span className="font-semibold text-white">
                          {packet.source} ➔ {packet.destination}
                        </span>
                      </div>
                    </div>
                  );
                }

                // Empty Slot
                return (
                  <div
                    key={`empty-${index}`}
                    className="flex flex-col justify-between p-2.5 rounded-lg border border-dashed border-gray-800 bg-[#111827]/30 text-gray-600 transition-all text-center min-h-[95px]"
                  >
                    <div className="flex items-center justify-between text-[9px] font-mono text-gray-600">
                      <span>Slot #{index + 1}</span>
                      <span>Empty</span>
                    </div>

                    <div className="my-auto text-[10px] font-mono text-gray-600">
                      Available Slot
                    </div>

                    <div className="text-[9px] font-mono text-gray-700">
                      Buffer Ready
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Queue Summary Strip */}
            <div className="border-t border-gray-800 pt-3 mt-3 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-gray-400">
              <div className="flex items-center gap-4">
                <span>
                  Occupancy: <strong className="text-gray-200">{router.queue_len} / {capacity}</strong>
                </span>
                <span>
                  Total Forwarded: <strong className="text-emerald-400">{router.total_processed}</strong>
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <ShieldAlert className="w-3.5 h-3.5" /> Tail Drops:
                  <strong className="text-rose-400">{router.total_dropped}</strong>
                </span>
              </div>

              {/* Priority Count Badges */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-500 uppercase">Waiting:</span>
                <span className="px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-900/60 text-rose-300 text-[10px]">
                  Crit: {router.priority_breakdown?.critical || 0}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-900/60 text-amber-300 text-[10px]">
                  High: {router.priority_breakdown?.high || 0}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-900/60 text-cyan-300 text-[10px]">
                  Norm: {router.priority_breakdown?.normal || 0}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-slate-900/60 border border-slate-700 text-slate-300 text-[10px]">
                  Low: {router.priority_breakdown?.low || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

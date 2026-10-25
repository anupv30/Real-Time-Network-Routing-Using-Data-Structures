import React, { useState } from 'react';
import { Zap, Layers, ArrowRight, ShieldAlert, CheckCircle2, Flame } from 'lucide-react';
import { PacketPriority } from '../../types';

interface PacketBurstSectionProps {
  sourceRouter: string;
  destinationRouter: string;
  routerList: string[];
  isStoppedOrPaused: boolean;
  onInjectBurst: (source: string, destination: string, count: number, priority: PacketPriority) => Promise<any>;
  onInjectSequence: (source: string, destination: string) => Promise<void>;
  onSourceChange?: (source: string) => void;
  onDestinationChange?: (destination: string) => void;
}

export const PacketBurstSection: React.FC<PacketBurstSectionProps> = ({
  sourceRouter,
  destinationRouter,
  routerList,
  isStoppedOrPaused,
  onInjectBurst,
  onInjectSequence,
  onSourceChange,
  onDestinationChange,
}) => {
  const [burstCount, setBurstCount] = useState<number>(10);
  const [priority, setPriority] = useState<PacketPriority>('normal');
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'warn' | 'info' } | null>(null);

  const effectiveDest = destinationRouter && destinationRouter !== sourceRouter
    ? destinationRouter
    : routerList.find((r) => r !== sourceRouter) || routerList[routerList.length - 1] || 'R5';

  const handleBurst = async (count: number) => {
    if (!sourceRouter || !effectiveDest) return;
    try {
      setLoading(true);
      setStatusMessage(null);
      const res = await onInjectBurst(sourceRouter, effectiveDest, count, priority);
      if (res && typeof res.dropped === 'number' && res.dropped > 0) {
        setStatusMessage({
          text: `Burst completed: ${res.enqueued} packets enqueued into ${sourceRouter}, ${res.dropped} dropped (Tail Drop).`,
          type: 'warn'
        });
      } else {
        setStatusMessage({
          text: `Burst completed: ${res?.enqueued || count} packets queued at ${sourceRouter}.`,
          type: 'success'
        });
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Burst injection failed', type: 'warn' });
    } finally {
      setLoading(false);
    }
  };

  const handleSequence = async () => {
    if (!sourceRouter || !effectiveDest) return;
    try {
      setLoading(true);
      setStatusMessage(null);
      await onInjectSequence(sourceRouter, effectiveDest);
      setStatusMessage({
        text: `Test sequence injected: Low ➔ Normal ➔ High ➔ Critical at ${sourceRouter}.`,
        type: 'info'
      });
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Sequence injection failed', type: 'warn' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl bg-[#0f172a] border border-[#1f293d] p-4 text-xs space-y-3 shadow-md">
      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-gray-200">Packet Burst & Test Sequence Injection</span>
        </div>
        <span className="text-[10px] font-mono text-gray-400">
          Target Router: <span className="text-cyan-400 font-bold">{sourceRouter}</span>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Source -> Destination */}
        <div className="flex items-center gap-1.5 bg-[#141b2d] border border-gray-800 px-2.5 py-1.5 rounded-lg">
          <span className="text-gray-400">Src:</span>
          <select
            value={sourceRouter}
            onChange={(e) => onSourceChange?.(e.target.value)}
            disabled={!onSourceChange}
            className="bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 text-gray-200 font-mono focus:outline-none"
          >
            {routerList.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <ArrowRight className="w-3.5 h-3.5 text-gray-500 mx-1" />

          <span className="text-gray-400">Dst:</span>
          <select
            value={effectiveDest}
            onChange={(e) => onDestinationChange?.(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 text-gray-200 font-mono focus:outline-none"
          >
            {routerList
              .filter((r) => r !== sourceRouter)
              .map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
          </select>
        </div>

        {/* Priority */}
        <div className="flex items-center gap-1.5 bg-[#141b2d] border border-gray-800 px-2.5 py-1.5 rounded-lg">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-gray-400">Priority:</span>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as PacketPriority)}
            className="bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 text-gray-200 font-mono capitalize focus:outline-none"
          >
            <option value="normal">Normal</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Burst Count Quick Presets */}
        <div className="flex items-center gap-1.5 bg-[#141b2d] border border-gray-800 px-2 py-1.5 rounded-lg font-mono">
          <span className="text-gray-400 mr-1">Count:</span>
          {[5, 10, 20, 30].map((c) => (
            <button
              key={c}
              onClick={() => setBurstCount(c)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                burstCount === c
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Trigger Burst */}
        <button
          onClick={() => handleBurst(burstCount)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold shadow-md transition disabled:opacity-50"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          {loading ? 'Injecting...' : `Inject Burst (${burstCount} pkts)`}
        </button>

        {/* Standard FIFO / Priority Test Sequence Button */}
        <button
          onClick={handleSequence}
          disabled={loading}
          title="Injects 4 packets in order: Low -> Normal -> High -> Critical to demonstrate FIFO or Priority Queue reordering"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/40 border border-indigo-500/40 font-medium transition disabled:opacity-50"
        >
          <Layers className="w-3.5 h-3.5" />
          Inject Test Sequence (Low ➔ Norm ➔ High ➔ Crit)
        </button>
      </div>

      {statusMessage && (
        <div
          className={`flex items-center gap-2 p-2 rounded-lg text-[11px] font-mono border ${
            statusMessage.type === 'warn'
              ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              : statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              : 'bg-blue-950/40 border-blue-800/60 text-blue-300'
          }`}
        >
          {statusMessage.type === 'warn' ? (
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
};

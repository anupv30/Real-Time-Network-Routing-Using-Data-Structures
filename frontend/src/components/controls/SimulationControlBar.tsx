import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  Send,
  Zap,
  Layers,
  ArrowRight
} from 'lucide-react';
import { PacketPriority } from '../../types';

interface ControlBarProps {
  simState: 'stopped' | 'running' | 'paused';
  autoGenerate: boolean;
  generationRatePps: number;
  sourceRouter: string;
  destinationRouter: string;
  priority: PacketPriority;
  routerList: string[];
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStep: () => void;
  onConfigChange: (config: {
    auto_generate?: boolean;
    generation_rate_pps?: number;
    gen_source?: string;
    gen_destination?: string;
    gen_priority?: PacketPriority;
  }) => void;
  onInjectPacket: (source: string, destination: string, priority: PacketPriority) => Promise<any>;
}

export const SimulationControlBar: React.FC<ControlBarProps> = ({
  simState,
  autoGenerate,
  generationRatePps,
  sourceRouter,
  destinationRouter,
  priority,
  routerList,
  onStart,
  onPause,
  onResume,
  onStep,
  onConfigChange,
  onInjectPacket,
}) => {
  const [injecting, setInjecting] = useState(false);

  const handleSendSingle = async () => {
    if (!sourceRouter || !destinationRouter) return;
    try {
      setInjecting(true);
      await onInjectPacket(sourceRouter, destinationRouter, priority);
    } catch (e: any) {
      alert(e.message || 'Packet injection failed');
    } finally {
      setInjecting(false);
    }
  };

  return (
    <div className="simulator-control-bar shrink-0 bg-[#0f172a] border-t border-[#1f293d] p-3 flex flex-wrap items-center justify-between gap-4 text-xs select-none">
      {/* Simulation Playback & Step */}
      <div className="flex items-center gap-2">
        {simState === 'running' ? (
          <button
            onClick={onPause}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/40 font-medium transition"
          >
            <Pause className="w-3.5 h-3.5" />
            Pause
          </button>
        ) : simState === 'paused' ? (
          <button
            onClick={onResume}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40 font-medium transition"
          >
            <Play className="w-3.5 h-3.5" />
            Resume
          </button>
        ) : (
          <button
            onClick={onStart}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40 font-medium transition"
          >
            <Play className="w-3.5 h-3.5" />
            Start
          </button>
        )}

        <button
          onClick={onStep}
          title="Advance single tick (50ms)"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition"
        >
          <SkipForward className="w-3.5 h-3.5" />
          Step (50ms)
        </button>
      </div>

      {/* Traffic Generator Controls */}
      <div className="flex items-center gap-4 bg-[#141b2d] border border-[#1f293d] px-3 py-1.5 rounded-lg">
        {/* Toggle Auto Generate */}
        <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-300">
          <input
            type="checkbox"
            checked={autoGenerate}
            onChange={(e) => onConfigChange({ auto_generate: e.target.checked })}
            className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-gray-900 border-gray-700"
          />
          <Zap className="w-3.5 h-3.5 text-yellow-400" />
          <span>Auto Generator</span>
        </label>

        {/* Rate Slider */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-mono">{generationRatePps} pps</span>
          <input
            type="range"
            min="0.5"
            max="10.0"
            step="0.5"
            value={generationRatePps}
            onChange={(e) => onConfigChange({ generation_rate_pps: parseFloat(e.target.value) })}
            className="w-20 accent-blue-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Manual Packet Injection Form */}
      <div className="flex items-center gap-2 bg-[#141b2d] border border-[#1f293d] px-3 py-1.5 rounded-lg">
        {/* Source */}
        <div className="flex items-center gap-1 text-gray-400">
          <span>From:</span>
          <select
            value={sourceRouter}
            onChange={(e) => onConfigChange({ gen_source: e.target.value })}
            className="bg-gray-900 border border-gray-700 rounded px-2 py-0.5 text-gray-200 font-mono focus:outline-none"
          >
            {routerList.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <ArrowRight className="w-3.5 h-3.5 text-gray-500" />

        {/* Destination */}
        <div className="flex items-center gap-1 text-gray-400">
          <span>To:</span>
          <select
            value={destinationRouter}
            onChange={(e) => onConfigChange({ gen_destination: e.target.value })}
            className="bg-gray-900 border border-gray-700 rounded px-2 py-0.5 text-gray-200 font-mono focus:outline-none"
          >
            {routerList.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div className="flex items-center gap-1 text-gray-400 ml-1">
          <Layers className="w-3 h-3 text-cyan-400" />
          <select
            value={priority}
            onChange={(e) => onConfigChange({ gen_priority: e.target.value as PacketPriority })}
            className="bg-gray-900 border border-gray-700 rounded px-2 py-0.5 text-gray-200 font-mono capitalize focus:outline-none"
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Send Button */}
        <button
          onClick={handleSendSingle}
          disabled={injecting}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 font-medium transition disabled:opacity-50 ml-1"
        >
          <Send className="w-3 h-3" />
          {injecting ? 'Sending...' : 'Send Packet'}
        </button>
      </div>
    </div>
  );
};

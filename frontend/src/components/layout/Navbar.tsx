import React from 'react';
import { Activity, Play, Pause, Square, RotateCcw, Zap, Wifi, WifiOff, Menu } from 'lucide-react';
import { ConnectionStatus } from '../../hooks/useSimulation';

interface NavbarProps {
  connectionStatus: ConnectionStatus;
  simState: 'stopped' | 'running' | 'paused';
  simTimeMs: number;
  speedMultiplier: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  isMenuOpen?: boolean;
  onMenuEnter?: () => void;
  onMenuLeave?: () => void;
  onMenuToggle?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  connectionStatus,
  simState,
  simTimeMs,
  speedMultiplier,
  onStart,
  onPause,
  onResume,
  onStop,
  onReset,
  onSpeedChange,
  isMenuOpen = false,
  onMenuEnter,
  onMenuLeave,
  onMenuToggle,
}) => {
  return (
    <header className="h-14 border-b border-[#1f293d] bg-[#0d1322] px-4 flex items-center justify-between select-none z-30 relative">
      {/* Brand & Hamburger Button */}
      <div className="flex items-center gap-2.5">
        <button
          id="hamburger-menu-button"
          onMouseEnter={onMenuEnter}
          onMouseLeave={onMenuLeave}
          onClick={onMenuToggle}
          className={`p-2 rounded-lg transition-all flex items-center justify-center group ${
            isMenuOpen
              ? 'bg-blue-600/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
              : 'text-gray-400 hover:text-cyan-300 hover:bg-[#141b2d] border border-transparent'
          }`}
          title="Navigation Menu (hover to open)"
        >
          <Menu className="w-5 h-5 transition-transform group-hover:scale-105" />
        </button>

        <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
          <Activity className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
            NetSim Pro
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-900/40 border border-blue-700/50 text-blue-300">
              v1.0
            </span>
          </h1>
          <p className="text-[11px] text-gray-400">Real-Time Network Packet Routing Simulator</p>
        </div>
      </div>

      {/* Center Controls & Indicators */}
      <div className="flex items-center gap-3">
        {/* Status Badge */}
        <div className="flex items-center gap-2 bg-[#141b2d] border border-[#1f293d] px-2.5 py-1 rounded-md text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              simState === 'running'
                ? 'bg-emerald-400 animate-ping'
                : simState === 'paused'
                ? 'bg-amber-400'
                : 'bg-gray-500'
            }`}
          />
          <span className="capitalize font-mono font-medium text-gray-300">{simState}</span>
        </div>

        {/* Sim Clock */}
        <div className="bg-[#141b2d] border border-[#1f293d] px-2.5 py-1 rounded-md text-xs text-gray-300 font-mono">
          <span className="text-gray-500 mr-1.5">SIM:</span>
          {(simTimeMs / 1000).toFixed(2)}s
        </div>

        {/* Speed Controls */}
        <div className="flex items-center bg-[#141b2d] border border-[#1f293d] rounded-md p-0.5 text-xs">
          <span className="px-2 text-gray-500 font-mono flex items-center gap-1">
            <Zap className="w-3 h-3 text-cyan-400" />
          </span>
          {[0.5, 1.0, 2.0, 4.0].map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-2 py-0.5 rounded font-mono text-xs transition-colors ${
                speedMultiplier === s
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 bg-[#141b2d] border border-[#1f293d] rounded-md p-1">
          {simState === 'running' ? (
            <button
              onClick={onPause}
              title="Pause Simulation"
              className="p-1.5 rounded hover:bg-amber-500/20 text-amber-400 transition"
            >
              <Pause className="w-4 h-4" />
            </button>
          ) : simState === 'paused' ? (
            <button
              onClick={onResume}
              title="Resume Simulation"
              className="p-1.5 rounded hover:bg-emerald-500/20 text-emerald-400 transition"
            >
              <Play className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onStart}
              title="Start Simulation"
              className="p-1.5 rounded hover:bg-emerald-500/20 text-emerald-400 transition"
            >
              <Play className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onStop}
            title="Stop Simulation"
            className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition"
          >
            <Square className="w-4 h-4" />
          </button>

          <button
            onClick={onReset}
            title="Reset Simulation & Metrics"
            className="p-1.5 rounded hover:bg-gray-700 text-gray-300 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right Connection Status */}
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded border ${
            connectionStatus === 'connected'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400'
              : connectionStatus === 'reconnecting'
              ? 'bg-amber-950/40 border-amber-800 text-amber-400 animate-pulse'
              : 'bg-red-950/40 border-red-800 text-red-400'
          }`}
        >
          {connectionStatus === 'connected' ? (
            <>
              <Wifi className="w-3.5 h-3.5" />
              <span>WS Live</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>{connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Disconnected'}</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

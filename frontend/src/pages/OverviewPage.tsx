import React, { useState } from 'react';
import { SimulationStateSnapshot, PacketPriority } from '../types';
import {
  Activity,
  Play,
  Shuffle,
  AlertTriangle,
  Layers,
  ArrowRight,
  CheckCircle2,
  Cpu,
  GitBranch,
  WifiOff
} from 'lucide-react';
import { ActiveTab } from '../components/layout/Sidebar';
import type { ConnectionStatus } from '../hooks/useSimulation';

interface OverviewPageProps {
  snapshot: SimulationStateSnapshot | null;
  connectionStatus: ConnectionStatus;
  onNavigate: (tab: ActiveTab) => void;
  onLoadTopology: (id: string) => Promise<void>;
  onStart: () => Promise<void>;
  onInjectPacket: (source: string, destination: string, priority: PacketPriority) => Promise<any>;
  onToggleRouterFailure: (id: string) => Promise<void>;
  onToggleRouterCongestion: (id: string) => Promise<void>;
  onUpdateConfig: (config: {
    auto_generate?: boolean;
    generation_rate_pps?: number;
    gen_source?: string;
    gen_destination?: string;
  }) => Promise<void>;
  onSetRouterSchedulingPolicy: (id: string, policy: 'fifo' | 'priority') => Promise<void>;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  snapshot,
  connectionStatus,
  onNavigate,
  onLoadTopology,
  onStart,
  onInjectPacket,
  onToggleRouterFailure,
  onToggleRouterCongestion,
  onUpdateConfig,
  onSetRouterSchedulingPolicy,
}) => {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const metrics = snapshot?.metrics;

  const runDemo = async (name: string, action: () => Promise<void>) => {
    if (activeDemo) return;
    setActiveDemo(name);
    setDemoError(null);
    try {
      await action();
    } catch (error) {
      setDemoError(error instanceof Error ? error.message : `Could not launch ${name}.`);
    } finally {
      setActiveDemo(null);
    }
  };

  const handleLaunchDemoA = async () => {
    await onLoadTopology('small');
    await onUpdateConfig({ auto_generate: true, generation_rate_pps: 2.0, gen_source: 'R1', gen_destination: 'R5' });
    await onStart();
    onNavigate('simulator');
  };

  const handleLaunchDemoB = async () => {
    await onLoadTopology('mesh');
    await onUpdateConfig({ auto_generate: true, generation_rate_pps: 50.0, gen_source: 'A', gen_destination: 'G' });
    await onToggleRouterCongestion('D');
    await onStart();
    onNavigate('simulator');
  };

  const handleLaunchDemoC = async () => {
    await onLoadTopology('lab');
    await onUpdateConfig({ auto_generate: true, generation_rate_pps: 2.0, gen_source: 'SRC', gen_destination: 'DST' });
    await onToggleRouterFailure('P2');
    await onStart();
    onNavigate('simulator');
  };

  const handleLaunchDemoD = async () => {
    await onLoadTopology('small');
    await onUpdateConfig({ auto_generate: false });
    await onSetRouterSchedulingPolicy('R1', 'priority');
    await onInjectPacket('R1', 'R5', 'low');
    await onInjectPacket('R1', 'R5', 'normal');
    await onInjectPacket('R1', 'R5', 'high');
    await onInjectPacket('R1', 'R5', 'critical');
    await onStart();
    onNavigate('queue');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0b0f19] space-y-6">
      {/* Hero Welcome */}
      <div className="rounded-xl bg-gradient-to-r from-blue-950/40 via-[#111827] to-[#0f172a] border border-[#1f293d] p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono">
              <Activity className="w-3.5 h-3.5" />
              Real-Time Network Simulator Platform
            </div>
            <h2 className="text-2xl font-bold text-gray-100 tracking-tight">
              Network Packet Routing & Queue Simulator
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              An interactive computer networks and algorithms platform demonstrating Dijkstra's shortest-path routing,
              router FIFO/Priority queuing, tail-drop congestion policies, and dynamic failure rerouting.
            </p>
          </div>

          <button
            onClick={() => onNavigate('simulator')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 transition"
          >
            <Play className="w-4 h-4 fill-current" />
            Launch Simulator
          </button>
        </div>
      </div>

      {connectionStatus !== 'connected' && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-700/60 bg-amber-950/30 px-4 py-3 text-xs text-amber-200">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            Backend live updates are {connectionStatus === 'reconnecting' ? 'reconnecting' : 'disconnected'}.
            Demo actions require the backend to be available.
          </span>
        </div>
      )}

      {demoError && (
        <div role="alert" className="rounded-lg border border-rose-700/60 bg-rose-950/30 px-4 py-3 text-xs text-rose-200">
          Could not launch demo: {demoError}
        </div>
      )}

      {/* 4 Interactive Demonstration Scenarios */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3 font-mono">
          One-Click Demonstration Scenarios
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Demo A */}
          <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-4 flex flex-col justify-between hover:border-blue-500/50 transition">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <GitBranch className="w-4 h-4" />
              </div>
              <div className="font-semibold text-gray-100 text-sm">Demo A: Shortest Path</div>
              <p className="text-xs text-gray-400">
                Loads Small Network (5 Routers), computes Dijkstra route from R1 to R5, and streams live packets along the path.
              </p>
            </div>
            <button
              onClick={() => runDemo('Demo A', handleLaunchDemoA)}
              disabled={activeDemo !== null}
              className="mt-4 flex items-center justify-between text-xs text-blue-400 font-semibold hover:text-blue-300 pt-2 border-t border-gray-800 disabled:opacity-50"
            >
              <span>{activeDemo === 'Demo A' ? 'Launching...' : 'Launch Demo A'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Demo B */}
          <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-4 flex flex-col justify-between hover:border-amber-500/50 transition">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="font-semibold text-gray-100 text-sm">Demo B: Congestion & Drops</div>
              <p className="text-xs text-gray-400">
                Loads Mesh Network, injects heavy traffic into Hub Router D, and observes queue overflow and tail-drop packet loss.
              </p>
            </div>
            <button
              onClick={() => runDemo('Demo B', handleLaunchDemoB)}
              disabled={activeDemo !== null}
              className="mt-4 flex items-center justify-between text-xs text-amber-400 font-semibold hover:text-amber-300 pt-2 border-t border-gray-800 disabled:opacity-50"
            >
              <span>{activeDemo === 'Demo B' ? 'Launching...' : 'Launch Demo B'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Demo C */}
          <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-4 flex flex-col justify-between hover:border-rose-500/50 transition">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <Shuffle className="w-4 h-4" />
              </div>
              <div className="font-semibold text-gray-100 text-sm">Demo C: Dynamic Rerouting</div>
              <p className="text-xs text-gray-400">
                Loads Failure Lab, fails primary router P2 on active path, and observes automatic dynamic reroute over backup link B1.
              </p>
            </div>
            <button
              onClick={() => runDemo('Demo C', handleLaunchDemoC)}
              disabled={activeDemo !== null}
              className="mt-4 flex items-center justify-between text-xs text-rose-400 font-semibold hover:text-rose-300 pt-2 border-t border-gray-800 disabled:opacity-50"
            >
              <span>{activeDemo === 'Demo C' ? 'Launching...' : 'Launch Demo C'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Demo D */}
          <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-4 flex flex-col justify-between hover:border-purple-500/50 transition">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div className="font-semibold text-gray-100 text-sm">Demo D: Priority Scheduling</div>
              <p className="text-xs text-gray-400">
                Injects Critical, High, Normal, and Low packets to inspect how router priority queue schedules Critical packets first.
              </p>
            </div>
            <button
              onClick={() => runDemo('Demo D', handleLaunchDemoD)}
              disabled={activeDemo !== null}
              className="mt-4 flex items-center justify-between text-xs text-purple-400 font-semibold hover:text-purple-300 pt-2 border-t border-gray-800 disabled:opacity-50"
            >
              <span>{activeDemo === 'Demo D' ? 'Launching...' : 'Launch Demo D'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Live Operational Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-4 space-y-2">
            <div className="text-xs text-gray-400 font-medium">Topology Health</div>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-mono font-bold text-gray-100">
                {metrics.active_routers_count} / {Object.keys(snapshot?.routers || {}).length}
              </div>
              <Cpu className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-[11px] text-gray-500">
              Active Links: {metrics.active_links_count} / {Object.keys(snapshot?.links || {}).length}
            </div>
          </div>

          <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-4 space-y-2">
            <div className="text-xs text-gray-400 font-medium">Packet Delivery Ratio</div>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-mono font-bold text-emerald-400">
                {metrics.delivery_ratio}%
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-[11px] text-gray-500">
              {metrics.total_delivered} delivered of {metrics.total_generated} generated
            </div>
          </div>

          <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-4 space-y-2">
            <div className="text-xs text-gray-400 font-medium">Network Throughput</div>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-mono font-bold text-cyan-400">
                {metrics.throughput_pps} pps
              </div>
              <Activity className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-[11px] text-gray-500">
              Avg Latency: {metrics.avg_latency_ms ? `${metrics.avg_latency_ms}ms` : '—'}
            </div>
          </div>
        </div>
      )}

      {/* Recent Simulation Log snippet */}
      <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-200">Recent Network Events</div>
          <button
            onClick={() => onNavigate('simulator')}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium"
          >
            View live feed &rarr;
          </button>
        </div>
        <div className="space-y-1.5 font-mono text-xs">
          {snapshot?.recent_events && snapshot.recent_events.length > 0 ? (
            snapshot.recent_events.slice(-5).reverse().map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 p-2 rounded bg-[#0d1322] border border-[#1f293d]/60 text-gray-300 text-[11px]"
              >
                <span className="text-gray-400 font-mono">
                  +{(e.timestamp_sim_ms / 1000).toFixed(2)}s
                </span>
                <span className="font-bold text-blue-400 uppercase">[{e.event_type}]</span>
                <span className="truncate">{e.message}</span>
              </div>
            ))
          ) : (
            <div className="text-gray-400 text-xs py-4 text-center">
              No events logged yet. Start the simulation to observe live traffic.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

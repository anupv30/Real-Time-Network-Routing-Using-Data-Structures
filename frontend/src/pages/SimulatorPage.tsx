import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SimulationStateSnapshot, PacketPriority, ShortestPathResult } from '../types';
import { KpiCards } from '../components/kpi/KpiCards';
import { NetworkCanvas } from '../components/canvas/NetworkCanvas';
import { InspectorPanel } from '../components/inspector/InspectorPanel';
import { SimulationControlBar } from '../components/controls/SimulationControlBar';
import { EventLogFeed } from '../components/feed/EventLogFeed';
import * as api from '../services/api';
import {
  Share2,
  Sparkles,
  X,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Route
} from 'lucide-react';

interface SimulatorPageProps {
  snapshot: SimulationStateSnapshot | null;
  selectedNodeId: string | null;
  selectedLinkId: string | null;
  onSelectNode: (id: string | null) => void;
  onSelectLink: (id: string | null) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStep: () => void;
  onConfigChange: (config: any) => void;
  onInjectPacket: (source: string, destination: string, priority: PacketPriority) => Promise<any>;
  onToggleRouterFailure: (id: string) => void;
  onToggleRouterCongestion: (id: string) => void;
  onToggleLinkFailure: (id: string) => void;
  onToggleLinkCongestion: (id: string) => void;
  initialShortestPathQuery?: { source: string; destination: string } | null;
  onClearShortestPathQuery?: () => void;
}

export const SimulatorPage: React.FC<SimulatorPageProps> = ({
  snapshot,
  selectedNodeId,
  selectedLinkId,
  onSelectNode,
  onSelectLink,
  onStart,
  onPause,
  onResume,
  onStep,
  onConfigChange,
  onInjectPacket,
  onToggleRouterFailure,
  onToggleRouterCongestion,
  onToggleLinkFailure,
  onToggleLinkCongestion,
  initialShortestPathQuery,
  onClearShortestPathQuery,
}) => {
  const routers = snapshot?.routers || {};
  const links = snapshot?.links || {};
  const inTransit = snapshot?.in_transit || [];
  const routerList = Object.keys(routers);

  const metrics = snapshot?.metrics || {
    total_generated: 0,
    total_delivered: 0,
    total_dropped: 0,
    in_transit: 0,
    queued: 0,
    delivery_ratio: 0,
    loss_ratio: 0,
    avg_latency_ms: null,
    min_latency_ms: null,
    max_latency_ms: null,
    throughput_pps: 0,
    avg_hop_count: null,
    total_reroutes: 0,
    elapsed_sim_time_sec: 0,
    avg_queue_utilization_pct: 0,
    active_routers_count: 0,
    active_links_count: 0,
  };

  const selectedNode = selectedNodeId ? routers[selectedNodeId] || null : null;
  const selectedLink = selectedLinkId ? links[selectedLinkId] || null : null;

  // Dijkstra Shortest-Path Highlighting State
  const [pathSource, setPathSource] = useState<string>(routerList[0] || 'R1');
  const [pathDestination, setPathDestination] = useState<string>(
    routerList[routerList.length - 1] || 'R5'
  );
  const [isPathHighlighted, setIsPathHighlighted] = useState<boolean>(false);
  const [dijkstraResult, setDijkstraResult] = useState<ShortestPathResult | null>(null);
  const [computingPath, setComputingPath] = useState<boolean>(false);
  const [showLinkWeights, setShowLinkWeights] = useState<boolean>(true);

  // Selected Packet Journey Tracking State
  const [selectedPacketId, setSelectedPacketId] = useState<string | null>(null);

  // Reset selected packet if simulation is reset
  useEffect(() => {
    if (snapshot?.sim_time_ms === 0 && snapshot?.state === 'stopped') {
      setSelectedPacketId(null);
    }
  }, [snapshot?.sim_time_ms, snapshot?.state]);

  // Sync default source/destination when routers load
  useEffect(() => {
    if (routerList.length > 0) {
      if (!routers[pathSource]) {
        setPathSource(routerList[0]);
      }
      if (!routers[pathDestination]) {
        setPathDestination(routerList[routerList.length - 1]);
      }
    }
  }, [routerList, routers, pathSource, pathDestination]);

  // Execute Dijkstra calculation
  const runDijkstra = async (src: string, dst: string) => {
    if (!src || !dst) return;
    try {
      setComputingPath(true);
      const res = await api.calculateDijkstra(src, dst, false);
      setDijkstraResult(res);
      setIsPathHighlighted(true);
    } catch (e: any) {
      console.warn('Dijkstra calculation error:', e);
    } finally {
      setComputingPath(false);
    }
  };

  // Handle external query from Routing Page
  useEffect(() => {
    if (initialShortestPathQuery?.source && initialShortestPathQuery?.destination) {
      setPathSource(initialShortestPathQuery.source);
      setPathDestination(initialShortestPathQuery.destination);
      runDijkstra(initialShortestPathQuery.source, initialShortestPathQuery.destination);
      onClearShortestPathQuery?.();
    }
  }, [initialShortestPathQuery]);

  // Topology fingerprint to trigger dynamic recalculation when topology changes (router failure/restore, link failure/restore, link congestion)
  const topologyFingerprint = useMemo(() => {
    if (!snapshot) return '';
    const rPart = Object.values(snapshot.routers)
      .map((r) => `${r.id}:${r.status}`)
      .sort()
      .join(',');
    const lPart = Object.values(snapshot.links)
      .map((l) => `${l.id}:${l.status}:${l.cost}`)
      .sort()
      .join(',');
    return `${rPart}|${lPart}`;
  }, [snapshot]);

  const prevFingerprintRef = useRef(topologyFingerprint);

  useEffect(() => {
    if (prevFingerprintRef.current !== topologyFingerprint) {
      prevFingerprintRef.current = topologyFingerprint;
      // Recalculate if path highlighting is currently active
      if (isPathHighlighted && pathSource && pathDestination) {
        runDijkstra(pathSource, pathDestination);
      }
    }
  }, [topologyFingerprint, isPathHighlighted, pathSource, pathDestination]);

  const handleHighlightPath = () => {
    runDijkstra(pathSource, pathDestination);
  };

  const handleClearHighlight = () => {
    setIsPathHighlighted(false);
    setDijkstraResult(null);
  };

  // Detailed step-by-step cost breakdown formula (e.g. "2 + 1 + 5 + 2 = 10")
  const costFormula = useMemo(() => {
    if (!dijkstraResult || !dijkstraResult.is_reachable || dijkstraResult.path.length < 2) {
      return null;
    }
    const costs: number[] = [];
    for (let i = 0; i < dijkstraResult.path.length - 1; i++) {
      const u = dijkstraResult.path[i];
      const v = dijkstraResult.path[i + 1];
      const link = Object.values(links).find(
        (l) => (l.source === u && l.target === v) || (l.source === v && l.target === u)
      );
      if (link) {
        costs.push(link.cost);
      }
    }
    if (costs.length === 0) return null;
    return `${costs.join(' + ')} = ${dijkstraResult.total_cost}`;
  }, [dijkstraResult, links]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] overflow-hidden">
      {/* Top KPI Cards */}
      <KpiCards metrics={metrics} />

      {/* Dijkstra Shortest-Path & Edge Weights Toolbar */}
      <div className="shrink-0 bg-[#0d1322] border-y border-[#1f293d] px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs select-none shadow-sm">
        {/* Left: Dijkstra Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
            <Route className="w-4 h-4 text-emerald-400" />
            <span>Shortest Path</span>
          </div>

          {/* Source Dropdown */}
          <div className="flex items-center gap-1 text-gray-400 bg-gray-900 border border-gray-700 px-2 py-1 rounded-lg font-mono">
            <span>Src:</span>
            <select
              value={pathSource}
              onChange={(e) => setPathSource(e.target.value)}
              className="bg-transparent text-gray-200 font-bold focus:outline-none cursor-pointer"
            >
              {routerList.map((r) => (
                <option key={r} value={r} className="bg-gray-900 text-gray-200">
                  {r} {routers[r]?.status === 'failed' ? '(Offline)' : ''}
                </option>
              ))}
            </select>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-gray-500" />

          {/* Destination Dropdown */}
          <div className="flex items-center gap-1 text-gray-400 bg-gray-900 border border-gray-700 px-2 py-1 rounded-lg font-mono">
            <span>Dst:</span>
            <select
              value={pathDestination}
              onChange={(e) => setPathDestination(e.target.value)}
              className="bg-transparent text-gray-200 font-bold focus:outline-none cursor-pointer"
            >
              {routerList.map((r) => (
                <option key={r} value={r} className="bg-gray-900 text-gray-200">
                  {r} {routers[r]?.status === 'failed' ? '(Offline)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Highlight Button */}
          <button
            onClick={handleHighlightPath}
            disabled={computingPath || pathSource === pathDestination}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold shadow transition ${
              isPathHighlighted
                ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500'
            } disabled:opacity-50`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {computingPath ? 'Computing...' : 'Highlight Shortest Path'}
          </button>

          {/* Clear Highlight Button */}
          {isPathHighlighted && (
            <button
              onClick={handleClearHighlight}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-800 text-gray-300 hover:bg-rose-950/40 hover:text-rose-300 border border-gray-700 transition"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Right: Edge Weights Visibility Toggle */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-gray-300 text-[11px] bg-gray-900/60 border border-gray-800 px-2.5 py-1 rounded-lg hover:border-gray-700 transition">
            <input
              type="checkbox"
              checked={showLinkWeights}
              onChange={(e) => setShowLinkWeights(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-cyan-600 focus:ring-0 bg-gray-900 border-gray-700"
            />
            {showLinkWeights ? (
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-gray-500" />
            )}
            <span>Show Edge Weights (Cost · Latency)</span>
          </label>
        </div>
      </div>

      {/* Shortest-Path Cost Breakdown Banner (Displays when a path is active) */}
      {isPathHighlighted && dijkstraResult && (
        <div
          className={`shrink-0 px-4 py-2 border-b text-xs flex flex-wrap items-center justify-between gap-3 shadow-md transition-all ${
            dijkstraResult.is_reachable
              ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-100'
              : 'bg-rose-950/40 border-rose-800/60 text-rose-200'
          }`}
        >
          {dijkstraResult.is_reachable ? (
            <>
              {/* Route sequence */}
              <div className="flex flex-wrap items-center gap-1.5 font-mono">
                <span className="font-bold text-emerald-300 flex items-center gap-1 mr-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Optimal Route:
                </span>
                {dijkstraResult.path.map((nodeId, idx) => (
                  <React.Fragment key={nodeId}>
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[11px] shadow-sm ${
                        idx === 0
                          ? 'bg-emerald-500 text-emerald-950 font-black'
                          : idx === dijkstraResult.path.length - 1
                          ? 'bg-fuchsia-500 text-fuchsia-950 font-black'
                          : 'bg-cyan-950/80 border border-cyan-500/50 text-cyan-200'
                      }`}
                    >
                      {nodeId}
                    </span>
                    {idx < dijkstraResult.path.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-emerald-400" />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Cost Calculation & Metrics */}
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
                {costFormula && (
                  <span className="bg-[#0b0f19]/80 border border-emerald-500/30 px-2 py-0.5 rounded text-emerald-300">
                    Calculation: <strong>{costFormula}</strong>
                  </span>
                )}
                <span className="bg-[#0b0f19]/80 border border-emerald-500/30 px-2 py-0.5 rounded text-cyan-300">
                  Total Cost: <strong>{dijkstraResult.total_cost}</strong>
                </span>
                <span className="bg-[#0b0f19]/80 border border-emerald-500/30 px-2 py-0.5 rounded text-amber-300">
                  Hops: <strong>{dijkstraResult.hops}</strong>
                </span>
                <span className="bg-[#0b0f19]/80 border border-emerald-500/30 px-2 py-0.5 rounded text-purple-300">
                  Total Latency: <strong>{dijkstraResult.total_latency_ms} ms</strong>
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 font-mono text-rose-300 font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>
                Destination <strong>{pathDestination}</strong> is Unreachable from <strong>{pathSource}</strong> due to router/link failure.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main Workspace (Canvas + Inspector) */}
      <div className="flex-1 flex relative min-h-0 min-w-0 overflow-hidden">
        <NetworkCanvas
          routers={routers}
          links={links}
          inTransit={inTransit}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onSelectLink={onSelectLink}
          onToggleRouterFailure={onToggleRouterFailure}
          onToggleRouterCongestion={onToggleRouterCongestion}
          showLinkWeights={showLinkWeights}
          highlightedPath={
            isPathHighlighted && dijkstraResult?.is_reachable ? dijkstraResult.path : []
          }
          highlightedLinkIds={
            isPathHighlighted && dijkstraResult?.is_reachable ? dijkstraResult.links_used : []
          }
          pathSource={isPathHighlighted ? pathSource : null}
          pathDestination={isPathHighlighted ? pathDestination : null}
          selectedPacketId={selectedPacketId}
          onSelectPacket={(pktId) => setSelectedPacketId(pktId)}
        />

        <InspectorPanel
          selectedNode={selectedNode}
          selectedLink={selectedLink}
          selectedPacketId={selectedPacketId}
          onSelectPacket={(pktId) => setSelectedPacketId(pktId)}
          onToggleRouterFailure={onToggleRouterFailure}
          onToggleRouterCongestion={onToggleRouterCongestion}
          onToggleLinkFailure={onToggleLinkFailure}
          onToggleLinkCongestion={onToggleLinkCongestion}
          isSimRunning={snapshot?.state === 'running'}
        />
      </div>

      {/* Simulation Control Bar */}
      <SimulationControlBar
        simState={snapshot?.state || 'stopped'}
        autoGenerate={snapshot?.auto_generate || false}
        generationRatePps={snapshot?.generation_rate_pps || 2.0}
        sourceRouter={snapshot?.gen_source || routerList[0] || ''}
        destinationRouter={snapshot?.gen_destination || routerList[routerList.length - 1] || ''}
        priority={snapshot?.gen_priority || 'normal'}
        routerList={routerList}
        onStart={onStart}
        onPause={onPause}
        onResume={onResume}
        onStep={onStep}
        onConfigChange={onConfigChange}
        onInjectPacket={onInjectPacket}
      />

      {/* Live Event Feed at bottom */}
      <EventLogFeed
        events={snapshot?.recent_events || []}
        onSelectPacket={(pktId) => setSelectedPacketId(pktId)}
      />
    </div>
  );
};

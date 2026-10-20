import React from 'react';
import { SimulationStateSnapshot, PacketPriority } from '../types';
import { KpiCards } from '../components/kpi/KpiCards';
import { NetworkCanvas } from '../components/canvas/NetworkCanvas';
import { InspectorPanel } from '../components/inspector/InspectorPanel';
import { SimulationControlBar } from '../components/controls/SimulationControlBar';
import { EventLogFeed } from '../components/feed/EventLogFeed';

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
}) => {
  const routers = snapshot?.routers || {};
  const links = snapshot?.links || {};
  const inTransit = snapshot?.in_transit || [];
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
  const routerList = Object.keys(routers);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] overflow-hidden">
      {/* Top KPI Cards */}
      <KpiCards metrics={metrics} />

      {/* Main Workspace (Canvas + Inspector) */}
      <div className="flex-1 flex relative min-h-0 min-w-0">
        <NetworkCanvas
          routers={routers}
          links={links}
          inTransit={inTransit}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onSelectLink={onSelectLink}
          onToggleRouterFailure={onToggleRouterFailure}
          onToggleRouterCongestion={onToggleRouterCongestion}
        />

        <InspectorPanel
          selectedNode={selectedNode}
          selectedLink={selectedLink}
          onToggleRouterFailure={onToggleRouterFailure}
          onToggleRouterCongestion={onToggleRouterCongestion}
          onToggleLinkFailure={onToggleLinkFailure}
          onToggleLinkCongestion={onToggleLinkCongestion}
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
      <EventLogFeed events={snapshot?.recent_events || []} />
    </div>
  );
};

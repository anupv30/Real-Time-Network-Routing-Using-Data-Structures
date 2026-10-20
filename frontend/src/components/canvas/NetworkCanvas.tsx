import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  BackgroundVariant,
  ViewportPortal,
  useNodesInitialized,
  useReactFlow,
} from '@xyflow/react';
import { useEffect, useRef } from 'react';
import '@xyflow/react/dist/style.css';

import { RouterState, LinkState, InTransitPacketData } from '../../types';
import { RouterNodeComponent } from './RouterNodeComponent';
import { PacketOverlay } from './PacketOverlay';

interface NetworkCanvasProps {
  routers: Record<string, RouterState>;
  links: Record<string, LinkState>;
  inTransit: InTransitPacketData[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onSelectLink: (id: string | null) => void;
  onToggleRouterFailure: (id: string) => void;
  onToggleRouterCongestion: (id: string) => void;
}

const nodeTypes = {
  router: RouterNodeComponent,
};

const ROUTER_WIDTH = 170;
const ROUTER_HEIGHT = 140;

interface LinkOverlayProps {
  routers: Record<string, RouterState>;
  links: Record<string, LinkState>;
  onSelectLink: (id: string | null) => void;
}

const LinkOverlay: React.FC<LinkOverlayProps> = ({ routers, links, onSelectLink }) => {
  const width = Math.max(1200, ...Object.values(routers).map((router) => router.x + ROUTER_WIDTH + 100));
  const height = Math.max(700, ...Object.values(routers).map((router) => router.y + ROUTER_HEIGHT + 100));

  return (
    <svg
      className="absolute left-0 top-0 overflow-visible"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ pointerEvents: 'none', zIndex: 0 }}
      aria-hidden="true"
    >
      <defs>
        <marker
          id="network-link-arrow"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L8,4 L0,8 z" fill="#38bdf8" />
        </marker>
      </defs>
      {Object.values(links).map((link) => {
        const source = routers[link.source];
        const target = routers[link.target];
        if (!source || !target) return null;

        const sourceX = source.x + ROUTER_WIDTH / 2;
        const sourceY = source.y + ROUTER_HEIGHT / 2;
        const targetX = target.x + ROUTER_WIDTH / 2;
        const targetY = target.y + ROUTER_HEIGHT / 2;
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const edgeScale = 1 / Math.max(
          Math.abs(dx) / (ROUTER_WIDTH / 2),
          Math.abs(dy) / (ROUTER_HEIGHT / 2),
          1,
        );
        const startX = sourceX + dx * edgeScale;
        const startY = sourceY + dy * edgeScale;
        const endX = targetX - dx * edgeScale;
        const endY = targetY - dy * edgeScale;
        const direction = dx < 0 ? -1 : 1;
        const controlOffset = Math.max(35, Math.abs(dx) * 0.35);
        const control1X = startX + direction * controlOffset;
        const control2X = endX - direction * controlOffset;
        const path = `M ${startX} ${startY} C ${control1X} ${startY}, ${control2X} ${endY}, ${endX} ${endY}`;
        const stroke = link.status === 'failed' ? '#ef4444' : link.status === 'congested' ? '#f59e0b' : '#38bdf8';
        const dash = link.status === 'failed' ? '6 6' : link.status === 'congested' ? '4 4' : undefined;

        return (
          <g key={link.id}>
            <path
              d={path}
              fill="none"
              stroke={stroke}
              strokeWidth={link.status === 'congested' ? 3 : 2.5}
              strokeDasharray={dash}
              markerEnd="url(#network-link-arrow)"
              opacity={link.status === 'failed' ? 0.45 : 0.85}
              pointerEvents="stroke"
              className="cursor-pointer"
              onClick={(event) => {
                event.stopPropagation();
                onSelectLink(link.id);
              }}
            >
              <title>{`${link.id} · ${link.latency_ms}ms · cost ${link.cost}`}</title>
            </path>
          </g>
        );
      })}
    </svg>
  );
};

const FitNetworkView: React.FC<{ layoutKey: string }> = ({ layoutKey }) => {
  const initialized = useNodesInitialized();
  const { fitView, getNodes } = useReactFlow();
  const fittedLayout = useRef('');

  useEffect(() => {
    if (!initialized || !layoutKey || fittedLayout.current === layoutKey) return;
    let frame = 0;
    let attempts = 0;
    let cancelled = false;

    const fitAfterNodesUpdate = () => {
      if (cancelled) return;

      const currentLayoutKey = getNodes()
        .map((node) => `${node.id}:${node.position.x},${node.position.y}`)
        .sort()
        .join('|');

      if (currentLayoutKey === layoutKey) {
        void fitView({ padding: 0.2 }).then((success) => {
          if (success && !cancelled) fittedLayout.current = layoutKey;
        });
        return;
      }

      attempts += 1;
      if (attempts < 10) frame = requestAnimationFrame(fitAfterNodesUpdate);
    };

    frame = requestAnimationFrame(fitAfterNodesUpdate);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [fitView, getNodes, initialized, layoutKey]);

  return null;
};

export const NetworkCanvas: React.FC<NetworkCanvasProps> = ({
  routers,
  links,
  inTransit,
  selectedNodeId,
  onSelectNode,
  onSelectLink,
  onToggleRouterFailure,
  onToggleRouterCongestion,
}) => {
  // Build React Flow nodes
  const nodes: Node[] = useMemo(() => {
    return Object.values(routers).map((r) => ({
      id: r.id,
      type: 'router',
      position: { x: r.x, y: r.y },
      initialWidth: 170,
      initialHeight: 140,
      data: {
        router: r,
        isSelected: selectedNodeId === r.id,
        onToggleFailure: onToggleRouterFailure,
        onToggleCongestion: onToggleRouterCongestion,
      },
    }));
  }, [routers, selectedNodeId, onToggleRouterFailure, onToggleRouterCongestion]);

  const layoutKey = useMemo(
    () => nodes
      .map((node) => `${node.id}:${node.position.x},${node.position.y}`)
      .sort()
      .join('|'),
    [nodes]
  );

  return (
    <div className="relative flex-1 min-w-0 min-h-[160px] bg-[#0b0f19] select-none overflow-hidden">
      <ReactFlow
        nodes={nodes}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        onPaneClick={() => {
          onSelectNode(null);
          onSelectLink(null);
        }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.25}
        maxZoom={2.0}
      >
        <FitNetworkView layoutKey={layoutKey} />
        <ViewportPortal>
          <LinkOverlay routers={routers} links={links} onSelectLink={onSelectLink} />
          <PacketOverlay inTransit={inTransit} routers={routers} />
        </ViewportPortal>
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e293b" />
        <Controls className="!bg-[#111827] !border-[#1f293d] !text-gray-300 fill-gray-300" />
        <MiniMap
          style={{ width: 140, height: 100 }}
          nodeStrokeWidth={3}
          nodeColor={(n) => {
            const r = routers[n.id];
            if (!r) return '#374151';
            return r.status === 'failed' ? '#ef4444' : r.status === 'congested' ? '#f59e0b' : '#3b82f6';
          }}
          className="!bg-[#0f172a]/80 !border-[#1f293d] rounded-lg overflow-hidden shadow-lg"
        />
      </ReactFlow>
    </div>
  );
};

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
  showLinkWeights?: boolean;
  highlightedPath?: string[];
  highlightedLinkIds?: string[];
  pathSource?: string | null;
  pathDestination?: string | null;
  selectedPacketId?: string | null;
  onSelectPacket?: (packetId: string) => void;
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
  showWeights?: boolean;
  highlightedPath?: string[];
  highlightedLinkIds?: string[];
}

const LinkOverlay: React.FC<LinkOverlayProps> = ({
  routers,
  links,
  onSelectLink,
  showWeights = true,
  highlightedPath = [],
  highlightedLinkIds = [],
}) => {
  const width = Math.max(1200, ...Object.values(routers).map((router) => router.x + ROUTER_WIDTH + 100));
  const height = Math.max(700, ...Object.values(routers).map((router) => router.y + ROUTER_HEIGHT + 100));

  const isPathActive = highlightedPath.length > 0;
  const highlightedLinkSet = useMemo(() => new Set(highlightedLinkIds), [highlightedLinkIds]);

  // Map of directed hops in the calculated shortest path: "fromId->toId" -> { hopIndex, from, to }
  const pathDirectedHops = useMemo(() => {
    const map = new Map<string, { hopIndex: number; from: string; to: string }>();
    for (let i = 0; i < highlightedPath.length - 1; i++) {
      const from = highlightedPath[i];
      const to = highlightedPath[i + 1];
      map.set(`${from}->${to}`, { hopIndex: i, from, to });
    }
    return map;
  }, [highlightedPath]);

  // Helper to compute exact coordinates and tangent angle along a cubic Bézier curve
  const getBezierPointAndAngle = (
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    t: number,
    isReverse: boolean,
  ) => {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const t2 = t * t;

    const x = mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x;
    const y = mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y;

    let dx = 3 * mt2 * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t2 * (p3.x - p2.x);
    let dy = 3 * mt2 * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t2 * (p3.y - p2.y);

    if (isReverse) {
      dx = -dx;
      dy = -dy;
    }

    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    return { x, y, angle };
  };

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
        {/* Glow filter for highlighted shortest path */}
        <filter id="glow-link-highlight" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#10b981" floodOpacity="0.75" />
        </filter>
      </defs>

      {/* Render Links, Directional Arrowheads, and Edge Weight Badges */}
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

        // Cubic Bézier control points
        const p0 = { x: startX, y: startY };
        const p1 = { x: control1X, y: startY };
        const p2 = { x: control2X, y: endY };
        const p3 = { x: endX, y: endY };
        const path = `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`;

        // Directional traversal check
        const forwardHop = pathDirectedHops.get(`${link.source}->${link.target}`);
        const reverseHop = pathDirectedHops.get(`${link.target}->${link.source}`);
        const activeHop = forwardHop || reverseHop;
        const isLinkOnPath = isPathActive && (highlightedLinkSet.has(link.id) || !!activeHop);
        const isForward = !!forwardHop || !reverseHop;

        const isFailed = link.status === 'failed';
        const isCongested = link.status === 'congested';

        let stroke = '#38bdf8';
        let strokeWidth = 2.2;
        let opacity = 0.85;
        let dash: string | undefined = undefined;
        let filter: string | undefined = undefined;

        if (isPathActive) {
          if (isLinkOnPath && !isFailed) {
            stroke = '#10b981';
            strokeWidth = 3.5;
            opacity = 1.0;
            filter = 'url(#glow-link-highlight)';
          } else {
            stroke = isFailed ? '#ef4444' : isCongested ? '#f59e0b' : '#334155';
            strokeWidth = isFailed ? 2.0 : 1.5;
            opacity = isFailed ? 0.35 : 0.25;
            dash = isFailed ? '6 6' : undefined;
          }
        } else {
          if (isFailed) {
            stroke = '#ef4444';
            strokeWidth = 2.2;
            dash = '6 6';
            opacity = 0.45;
          } else if (isCongested) {
            stroke = '#f59e0b';
            strokeWidth = 3.0;
            dash = '4 4';
          }
        }

        // Midpoint calculation on cubic Bézier (t = 0.5)
        const midX = 0.125 * p0.x + 0.375 * p1.x + 0.375 * p2.x + 0.125 * p3.x;
        const midY = 0.125 * p0.y + 0.375 * p1.y + 0.375 * p2.y + 0.125 * p3.y;

        // Tangent & Normal at t = 0.5 for label positioning (offset perpendicular to wire)
        const tanMidX = 3 * 0.25 * (p1.x - p0.x) + 6 * 0.25 * (p2.x - p1.x) + 3 * 0.25 * (p3.x - p2.x);
        const tanMidY = 3 * 0.25 * (p1.y - p0.y) + 6 * 0.25 * (p2.y - p1.y) + 3 * 0.25 * (p3.y - p2.y);
        const tanLen = Math.hypot(tanMidX, tanMidY) || 1;
        let normX = -tanMidY / tanLen;
        let normY = tanMidX / tanLen;
        if (normY > 0 || (Math.abs(normY) < 0.2 && normX < 0)) {
          normX = -normX;
          normY = -normY;
        }
        const labelX = midX + normX * 13;
        const labelY = midY + normY * 13;

        // Directional arrowhead calculation for shortest path
        // Forward traverses t: 0 -> 1 (arrow at t = 0.70 approaching destination)
        // Reverse traverses t: 1 -> 0 (arrow at t = 0.30 approaching source)
        const arrowData =
          isLinkOnPath && !isFailed
            ? getBezierPointAndAngle(p0, p1, p2, p3, isForward ? 0.70 : 0.30, !isForward)
            : null;

        // Edge Weight Badge styling
        const isDimmedLabel = isPathActive && !isLinkOnPath && !isFailed;
        let badgeBg = '#0f172a';
        let badgeBorder = '#334155';
        let costColor = '#38bdf8';
        let badgeWidth = 80;

        if (isLinkOnPath && !isFailed) {
          badgeBg = '#022c22';
          badgeBorder = '#10b981';
          costColor = '#6ee7b7';
          badgeWidth = 84;
        } else if (isCongested && !isFailed) {
          badgeBg = '#451a03';
          badgeBorder = '#f59e0b';
          costColor = '#fbbf24';
          badgeWidth = 84;
        } else if (isFailed) {
          badgeBg = '#450a0a';
          badgeBorder = '#ef4444';
          costColor = '#f87171';
          badgeWidth = 70;
        }

        return (
          <g key={link.id}>
            {/* Connection Wire Path */}
            <path
              d={path}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={dash}
              opacity={opacity}
              filter={filter}
              pointerEvents="stroke"
              className="cursor-pointer transition-colors duration-200"
              onClick={(event) => {
                event.stopPropagation();
                onSelectLink(link.id);
              }}
            >
              <title>{`${link.id} · Cost: ${link.cost} · ${link.latency_ms}ms · Status: ${link.status}`}</title>
            </path>

            {/* Directional Shortest-Path Arrowhead (subtle, proportional, along route traversal) */}
            {isLinkOnPath && !isFailed && arrowData && (
              <g
                transform={`translate(${arrowData.x}, ${arrowData.y}) rotate(${arrowData.angle})`}
                pointerEvents="none"
                filter="url(#glow-link-highlight)"
              >
                <path
                  d="M -4.5 -3.5 L 4.5 0 L -4.5 3.5 L -2.5 0 Z"
                  fill="#10b981"
                  stroke="#064e3b"
                  strokeWidth={0.8}
                />
              </g>
            )}

            {/* Edge Weight & Latency Label Badge */}
            {showWeights && (
              <g
                transform={`translate(${labelX}, ${labelY})`}
                className="cursor-pointer select-none"
                pointerEvents="all"
                opacity={isDimmedLabel ? 0.35 : 1.0}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectLink(link.id);
                }}
              >
                {/* Background pill */}
                <rect
                  x={-badgeWidth / 2}
                  y="-10"
                  width={badgeWidth}
                  height="20"
                  rx="10"
                  fill={badgeBg}
                  stroke={badgeBorder}
                  strokeWidth={isLinkOnPath ? 1.8 : 1.2}
                  filter={isLinkOnPath ? 'url(#glow-link-highlight)' : undefined}
                  className="transition-all duration-200"
                />

                {/* Content text: clearly distinguishes Cost from Latency */}
                {isFailed ? (
                  <text
                    x="0"
                    y="3.5"
                    textAnchor="middle"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                    fill="#f87171"
                  >
                    ✕ Severed
                  </text>
                ) : (
                  <text
                    x="0"
                    y="3.5"
                    textAnchor="middle"
                    fontSize="9"
                    fontFamily="monospace"
                    className="transition-colors"
                  >
                    <tspan fill={costColor} fontWeight="bold">
                      Cost: {link.cost}
                    </tspan>
                    <tspan fill="#94a3b8" fontSize="8">
                      {' '}· {link.latency_ms}ms
                    </tspan>
                  </text>
                )}
              </g>
            )}
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
  showLinkWeights = true,
  highlightedPath = [],
  highlightedLinkIds = [],
  pathSource = null,
  pathDestination = null,
  selectedPacketId = null,
  onSelectPacket,
}) => {
  const isPathActive = (highlightedPath?.length ?? 0) > 0;
  const pathSet = useMemo(() => new Set(highlightedPath || []), [highlightedPath]);

  // Build React Flow nodes
  const nodes: Node[] = useMemo(() => {
    return Object.values(routers).map((r) => {
      const isPathSource = pathSource === r.id;
      const isPathDestination = pathDestination === r.id;
      const isPathNode = !isPathSource && !isPathDestination && pathSet.has(r.id);
      const isDimmed = isPathActive && !pathSet.has(r.id);
      const hopIndex = highlightedPath ? highlightedPath.indexOf(r.id) : -1;

      return {
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
          isPathSource,
          isPathDestination,
          isPathNode,
          pathHopIndex: hopIndex >= 0 ? hopIndex + 1 : undefined,
          isDimmed,
        },
      };
    });
  }, [
    routers,
    selectedNodeId,
    onToggleRouterFailure,
    onToggleRouterCongestion,
    pathSource,
    pathDestination,
    pathSet,
    isPathActive,
    highlightedPath,
  ]);

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
          <LinkOverlay
            routers={routers}
            links={links}
            onSelectLink={onSelectLink}
            showWeights={showLinkWeights}
            highlightedPath={highlightedPath}
            highlightedLinkIds={highlightedLinkIds}
          />
          <PacketOverlay
            inTransit={inTransit}
            routers={routers}
            selectedPacketId={selectedPacketId}
            onSelectPacket={onSelectPacket}
          />
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

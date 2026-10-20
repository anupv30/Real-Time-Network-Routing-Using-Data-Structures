import React from 'react';
import { useViewport } from '@xyflow/react';
import { InTransitPacketData, RouterState } from '../../types';

interface PacketOverlayProps {
  inTransit: InTransitPacketData[];
  routers: Record<string, RouterState>;
}

export const PacketOverlay: React.FC<PacketOverlayProps> = ({ inTransit, routers }) => {
  const { zoom } = useViewport();
  if (!inTransit || inTransit.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {inTransit.map((pkt) => {
        const srcRouter = routers[pkt.source];
        const dstRouter = routers[pkt.target];

        if (!srcRouter || !dstRouter) return null;

        // Node center offsets (each node ~170px wide, ~140px tall)
        const srcCenterX = srcRouter.x + 85;
        const srcCenterY = srcRouter.y + 70;
        const dstCenterX = dstRouter.x + 85;
        const dstCenterY = dstRouter.y + 70;

        const currentX = srcCenterX + (dstCenterX - srcCenterX) * pkt.progress;
        const currentY = srcCenterY + (dstCenterY - srcCenterY) * pkt.progress;

        const priorityColor =
          pkt.priority === 'critical'
            ? 'bg-rose-500 shadow-rose-500/80 border-rose-300'
            : pkt.priority === 'high'
            ? 'bg-amber-500 shadow-amber-500/80 border-amber-300'
            : pkt.priority === 'low'
            ? 'bg-slate-400 shadow-slate-400/80 border-slate-200'
            : 'bg-cyan-400 shadow-cyan-400/80 border-cyan-200';

        return (
          <div
            key={pkt.packet_id}
            style={{
              position: 'absolute',
              left: `${currentX}px`,
              top: `${currentY}px`,
              transform: `translate(-50%, -50%) scale(${1 / zoom})`,
              transition: 'left 0.05s linear, top 0.05s linear',
            }}
            className="flex items-center gap-1"
          >
            <div
              className={`w-3.5 h-3.5 rounded-full border shadow-md animate-pulse ${priorityColor}`}
            />
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/80 text-white font-bold border border-gray-700 backdrop-blur-sm">
              {pkt.packet_id.split('-')[1] || pkt.packet_id}
            </span>
          </div>
        );
      })}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { EventLogItem } from '../../types';
import { Terminal, Filter, Trash2, CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from 'lucide-react';

interface EventLogFeedProps {
  events: EventLogItem[];
  onSelectPacket?: (packetId: string) => void;
  onClose?: () => void;
}

export const EventLogFeed: React.FC<EventLogFeedProps> = ({ events, onSelectPacket, onClose }) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [clearedBefore, setClearedBefore] = useState<number>(0);

  const filteredEvents = useMemo(() => {
    return events
      .filter((e) => e.timestamp_sim_ms >= clearedBefore)
      .filter((e) => (filterSeverity === 'all' ? true : e.severity === filterSeverity))
      .filter((e) =>
        search.trim() === ''
          ? true
          : e.message.toLowerCase().includes(search.toLowerCase()) ||
            e.event_type.toLowerCase().includes(search.toLowerCase())
      );
  }, [events, filterSeverity, search, clearedBefore]);

  const getSeverityIcon = (sev: string) => {
    switch (sev) {
      case 'success':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'error':
        return <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
      default:
        return <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    }
  };

  return (
    <div className="simulation-event-feed h-36 shrink-0 bg-[#0a0e1a] border-t border-[#1f293d] flex flex-col text-xs select-none">
      {/* Header & Filters */}
      <div className="h-9 px-3 border-b border-[#1f293d] flex items-center justify-between bg-[#0d1322]">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-gray-200">Simulation Event Feed</span>
          <span className="font-mono text-[10px] text-gray-500">({filteredEvents.length} events)</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <input
            type="text"
            placeholder="Filter events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded px-2 py-0.5 text-[11px] text-gray-200 focus:outline-none w-32"
          />

          {/* Severity filter */}
          <div className="flex items-center gap-1 bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-[10px] font-mono">
            <Filter className="w-3 h-3 text-gray-400" />
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-transparent text-gray-300 focus:outline-none capitalize"
            >
              <option value="all">All</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>

          {/* Clear button */}
          <button
            onClick={() => setClearedBefore(Date.now())}
            title="Clear Event Feed View"
            className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              title="Close Event Feed (reopen from bottom edge or layout dock)"
              className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200 ml-1 border-l border-gray-700/60 pl-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-[11px]">
        {filteredEvents.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            No events match current filter.
          </div>
        ) : (
          [...filteredEvents].reverse().map((e) => (
            <div
              key={e.id}
              className={`flex items-start gap-2 px-2 py-1 rounded transition-colors ${
                e.severity === 'error'
                  ? 'bg-rose-950/20 text-rose-300 border-l-2 border-rose-500'
                  : e.severity === 'warning'
                  ? 'bg-amber-950/20 text-amber-300 border-l-2 border-amber-500'
                  : e.severity === 'success'
                  ? 'bg-emerald-950/20 text-emerald-300 border-l-2 border-emerald-500'
                  : 'bg-[#111827]/50 text-gray-300'
              }`}
            >
              {getSeverityIcon(e.severity)}
              <span className="text-gray-400 text-[10px] shrink-0 font-mono">
                +{(e.timestamp_sim_ms / 1000).toFixed(2)}s
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 shrink-0">
                [{e.event_type}]
              </span>
              <span className="flex-1 break-words">
                {(() => {
                  const regex = /(PKT-[A-Za-z0-9]+)/g;
                  const parts = e.message.split(regex);
                  return (
                    <>
                      {parts.map((part, idx) => {
                        if (regex.test(part)) {
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                onSelectPacket?.(part);
                              }}
                              title={`Track journey of packet ${part}`}
                              className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] hover:bg-cyan-900 hover:text-cyan-100 hover:border-cyan-400 cursor-pointer transition-colors shadow-xs"
                            >
                              {part}
                            </button>
                          );
                        }
                        return <span key={idx}>{part}</span>;
                      })}
                      {e.packet_id && !e.message.includes(e.packet_id) && (
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onSelectPacket?.(e.packet_id!);
                          }}
                          title={`Track journey of packet ${e.packet_id}`}
                          className="inline-flex items-center ml-1 px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] hover:bg-cyan-900 hover:text-cyan-100 hover:border-cyan-400 cursor-pointer transition-colors"
                        >
                          {e.packet_id}
                        </button>
                      )}
                    </>
                  );
                })()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

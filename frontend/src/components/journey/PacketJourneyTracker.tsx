import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  PacketJourneyDetails,
  RecentPacketSummary,
  PacketStatus,
  PacketPriority
} from '../../types';
import * as api from '../../services/api';
import {
  Navigation,
  Clock,
  CheckCircle2,
  AlertOctagon,
  Layers,
  Cpu,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  Sparkles,
  MapPin,
  Send,
  Timer,
  Hash,
  Activity,
  AlertTriangle,
  X
} from 'lucide-react';

interface PacketJourneyTrackerProps {
  selectedPacketId: string | null;
  onSelectPacket: (packetId: string | null) => void;
  isSimRunning?: boolean;
}

// Safe formatting helpers to prevent runtime TypeError on undefined/null/NaN
function formatSimTime(ms: number | undefined | null): string {
  if (ms === undefined || ms === null || isNaN(Number(ms))) {
    return '+0.00s (0ms)';
  }
  const val = Number(ms);
  return `+${(val / 1000).toFixed(2)}s (${val.toFixed(0)}ms)`;
}

function formatLatency(ms: number | undefined | null): string {
  if (ms === undefined || ms === null || isNaN(Number(ms))) {
    return 'N/A';
  }
  return `${Number(ms).toFixed(1)} ms`;
}

export const PacketJourneyTracker: React.FC<PacketJourneyTrackerProps> = ({
  selectedPacketId,
  onSelectPacket,
  isSimRunning = false,
}) => {
  const [recentPackets, setRecentPackets] = useState<RecentPacketSummary[]>([]);
  const [journey, setJourney] = useState<PacketJourneyDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingList, setLoadingList] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state for recent packets
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showRecentDropdown, setShowRecentDropdown] = useState<boolean>(false);

  const prevJourneyJsonRef = useRef<string>('');

  // 1. Fetch recent packets list
  const loadRecentPackets = async () => {
    try {
      setLoadingList(true);
      const res = await api.fetchRecentPackets(40);
      setRecentPackets(res.packets || []);
    } catch (err: any) {
      console.warn('Failed to load recent packets:', err);
    } finally {
      setLoadingList(false);
    }
  };

  // 2. Fetch specific packet journey
  const loadPacketJourney = async (packetId: string, isSilent = false) => {
    if (!packetId) return;
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const data = await api.fetchPacketJourney(packetId);
      const jsonStr = JSON.stringify(data);
      if (jsonStr !== prevJourneyJsonRef.current) {
        prevJourneyJsonRef.current = jsonStr;
        setJourney(data);
      }
    } catch (err: any) {
      setError(err.message || 'Packet journey not found or no longer retained.');
      setJourney(null);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Initial load of recent packets and whenever dropdown opens
  useEffect(() => {
    loadRecentPackets();
  }, []);

  // Poll recent packets periodically while simulation is running
  useEffect(() => {
    if (!isSimRunning) return;
    const interval = setInterval(() => {
      loadRecentPackets();
    }, 1200);
    return () => clearInterval(interval);
  }, [isSimRunning]);

  // Load journey when selectedPacketId changes
  useEffect(() => {
    if (selectedPacketId) {
      prevJourneyJsonRef.current = '';
      loadPacketJourney(selectedPacketId, false);
    } else {
      setJourney(null);
      setError(null);
    }
  }, [selectedPacketId]);

  // Real-time polling for active (non-terminal) selected packet
  useEffect(() => {
    if (!selectedPacketId) return;
    const isTerminal = journey?.status === 'delivered' || journey?.status === 'dropped';
    if (isTerminal && !isSimRunning) return;

    const interval = setInterval(() => {
      loadPacketJourney(selectedPacketId, true);
    }, 350);

    return () => clearInterval(interval);
  }, [selectedPacketId, journey?.status, isSimRunning]);

  // Filtered recent packets
  const filteredPackets = useMemo(() => {
    return recentPackets.filter((p) => {
      if (searchFilter.trim() && !p.id.toLowerCase().includes(searchFilter.trim().toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false;
      }
      if (priorityFilter !== 'all' && p.priority !== priorityFilter) {
        return false;
      }
      return true;
    });
  }, [recentPackets, searchFilter, statusFilter, priorityFilter]);

  // Status badge helper
  const getStatusBadge = (status?: PacketStatus | string, dropReason?: string | null) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Delivered
          </span>
        );
      case 'dropped':
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/40"
            title={dropReason ? `Reason: ${dropReason}` : 'Packet dropped'}
          >
            <AlertOctagon className="w-3 h-3 text-rose-400" />
            Dropped {dropReason ? `(${String(dropReason).replace(/_/g, ' ')})` : ''}
          </span>
        );
      case 'in_transit':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 animate-pulse">
            <Send className="w-3 h-3 text-cyan-400" />
            In Transit
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/40">
            <Cpu className="w-3 h-3 text-purple-400" />
            Processing
          </span>
        );
      case 'queued':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/40">
            <Layers className="w-3 h-3 text-amber-400" />
            Queued
          </span>
        );
    }
  };

  // Priority color helper
  const getPriorityBadge = (priority?: PacketPriority | string) => {
    const p = (priority || 'normal').toLowerCase();
    const colorClasses: Record<string, string> = {
      critical: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      high: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      normal: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      low: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    };
    return (
      <span
        className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold border ${colorClasses[p] || colorClasses.normal}`}
      >
        {p}
      </span>
    );
  };

  // Timeline icon and color selector
  const getEventVisuals = (stage?: string, eventType?: string) => {
    const s = (stage || eventType || 'EVENT').toUpperCase();
    switch (s) {
      case 'GENERATED':
        return {
          icon: <Sparkles className="w-3.5 h-3.5 text-cyan-400" />,
          borderColor: 'border-cyan-500',
          bgColor: 'bg-cyan-950/40',
          textColor: 'text-cyan-300'
        };
      case 'QUEUED':
        return {
          icon: <Layers className="w-3.5 h-3.5 text-amber-400" />,
          borderColor: 'border-amber-500',
          bgColor: 'bg-amber-950/40',
          textColor: 'text-amber-300'
        };
      case 'PROCESSING':
        return {
          icon: <Cpu className="w-3.5 h-3.5 text-purple-400" />,
          borderColor: 'border-purple-500',
          bgColor: 'bg-purple-950/40',
          textColor: 'text-purple-300'
        };
      case 'PROCESSING_COMPLETED':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />,
          borderColor: 'border-indigo-500',
          bgColor: 'bg-indigo-950/40',
          textColor: 'text-indigo-300'
        };
      case 'FORWARDED':
      case 'IN_TRANSIT':
        return {
          icon: <Send className="w-3.5 h-3.5 text-blue-400" />,
          borderColor: 'border-blue-500',
          bgColor: 'bg-blue-950/40',
          textColor: 'text-blue-300'
        };
      case 'ARRIVED':
        return {
          icon: <MapPin className="w-3.5 h-3.5 text-emerald-400" />,
          borderColor: 'border-emerald-500',
          bgColor: 'bg-emerald-950/40',
          textColor: 'text-emerald-300'
        };
      case 'REROUTED':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />,
          borderColor: 'border-amber-500',
          bgColor: 'bg-amber-950/40',
          textColor: 'text-amber-200'
        };
      case 'DELIVERED':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
          borderColor: 'border-emerald-400',
          bgColor: 'bg-emerald-950/50',
          textColor: 'text-emerald-200'
        };
      case 'DROPPED':
        return {
          icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />,
          borderColor: 'border-rose-500',
          bgColor: 'bg-rose-950/50',
          textColor: 'text-rose-200'
        };
      default:
        return {
          icon: <Activity className="w-3.5 h-3.5 text-gray-400" />,
          borderColor: 'border-gray-600',
          bgColor: 'bg-gray-900/40',
          textColor: 'text-gray-300'
        };
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#0d1322] select-none text-xs overflow-hidden">
      {/* 1. Header & Recent Packet Picker */}
      <div className="shrink-0 p-2.5 border-b border-[#1f293d] bg-[#0f172a] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-gray-200">
            <Navigation className="w-4 h-4 text-cyan-400" />
            <span className="tracking-wide">Packet Journey Tracker</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                loadRecentPackets();
                if (selectedPacketId) loadPacketJourney(selectedPacketId, false);
              }}
              title="Refresh recent packets and journey"
              className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition"
            >
              <RefreshCw className={`w-3 h-3 ${loading || loadingList ? 'animate-spin' : ''}`} />
            </button>
            {selectedPacketId && (
              <button
                onClick={() => onSelectPacket(null)}
                title="Deselect packet"
                className="p-1 rounded bg-gray-800 hover:bg-rose-900/60 text-gray-400 hover:text-rose-300 transition"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Packet Selection Bar */}
        <div className="relative">
          <button
            onClick={() => setShowRecentDropdown((prev) => !prev)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-[#131b2e] border border-[#27354f] text-left hover:border-cyan-500/50 transition font-mono text-[11px]"
          >
            <span className="truncate">
              {selectedPacketId ? (
                <span className="text-cyan-300 font-semibold">{selectedPacketId}</span>
              ) : (
                <span className="text-gray-400">Select packet to track...</span>
              )}
            </span>
            <span className="text-[10px] text-gray-400 font-sans ml-1">
              ({recentPackets.length} recent) ▼
            </span>
          </button>

          {/* Searchable Dropdown Overlay */}
          {showRecentDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-[#0d1322] border border-[#27354f] rounded-lg shadow-2xl p-2 space-y-2 max-h-72 flex flex-col">
              {/* Search & Filters */}
              <div className="space-y-1.5 shrink-0">
                <div className="flex items-center gap-1.5 bg-[#141b2d] border border-gray-700 rounded px-2 py-1">
                  <Search className="w-3 h-3 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search PKT-ID..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="bg-transparent text-[11px] text-gray-200 focus:outline-none w-full font-mono"
                  />
                  {searchFilter && (
                    <button
                      onClick={() => setSearchFilter('')}
                      className="text-gray-500 hover:text-gray-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-[#141b2d] border border-gray-700 rounded px-1.5 py-0.5 text-gray-300 capitalize"
                  >
                    <option value="all">All Statuses</option>
                    <option value="in_transit">In Transit</option>
                    <option value="processing">Processing</option>
                    <option value="queued">Queued</option>
                    <option value="delivered">Delivered</option>
                    <option value="dropped">Dropped</option>
                  </select>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="bg-[#141b2d] border border-gray-700 rounded px-1.5 py-0.5 text-gray-300 capitalize"
                  >
                    <option value="all">All Priorities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              {/* Packets list */}
              <div className="flex-1 overflow-y-auto space-y-1 divide-y divide-gray-800/40">
                {filteredPackets.length === 0 ? (
                  <div className="py-4 text-center text-gray-500 text-[11px]">
                    No recent packets match filters.
                  </div>
                ) : (
                  filteredPackets.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSelectPacket(p.id);
                        setShowRecentDropdown(false);
                      }}
                      className={`w-full text-left py-1.5 px-2 rounded flex items-center justify-between font-mono text-[11px] transition ${
                        selectedPacketId === p.id
                          ? 'bg-cyan-950/60 border border-cyan-500/50 text-cyan-200'
                          : 'hover:bg-[#1a233a] text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold truncate text-[11px]">{p.id}</span>
                        <span className="text-[10px] text-gray-500">
                          {p.source}➔{p.destination}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {getPriorityBadge(p.priority)}
                        <span
                          className={`text-[9px] uppercase px-1 py-0.2 rounded font-bold ${
                            p.status === 'delivered'
                              ? 'text-emerald-400 bg-emerald-950/40'
                              : p.status === 'dropped'
                              ? 'text-rose-400 bg-rose-950/40'
                              : p.status === 'in_transit'
                              ? 'text-cyan-400 bg-cyan-950/40'
                              : 'text-amber-400 bg-amber-950/40'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Scrollable Tracker Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {error ? (
          <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/60 text-rose-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Packet Not Found</span>
            </div>
            <p className="text-[11px] text-rose-300/80">{error}</p>
          </div>
        ) : !selectedPacketId ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-gray-400 space-y-3">
            <div className="w-12 h-12 rounded-full bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <Navigation className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="font-semibold text-gray-200 text-sm">No Packet Selected</div>
              <p className="text-[11px] text-gray-500 max-w-xs mt-1">
                Select any packet from the dropdown above, click a packet ID badge in the Event Feed, or click an in-transit packet on the network canvas.
              </p>
            </div>
            {recentPackets.length > 0 && (
              <div className="w-full pt-2 border-t border-gray-800">
                <div className="text-[10px] text-gray-500 uppercase font-semibold mb-1.5 text-left">
                  Quick Select Recent:
                </div>
                <div className="flex flex-wrap gap-1">
                  {recentPackets.slice(0, 6).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onSelectPacket(p.id)}
                      className="px-2 py-0.5 rounded bg-[#131b2e] hover:bg-cyan-950/60 border border-gray-700 hover:border-cyan-500/50 text-[10px] font-mono text-cyan-300 transition"
                    >
                      {p.id} ({p.source}➔{p.destination})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : journey ? (
          <>
            {/* Packet Overview Card */}
            <div className="bg-[#141b2d] border border-[#1f293d] rounded-lg p-3 space-y-2.5">
              <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
                <div className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-mono font-bold text-sm text-gray-100">{journey.packet_id}</span>
                </div>
                <div>{getStatusBadge(journey.status, journey.drop_reason)}</div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-[#0e1424] p-1.5 rounded border border-gray-800/60">
                  <span className="text-gray-500 text-[10px] block">Source ➔ Dest</span>
                  <span className="text-cyan-300 font-bold">
                    {journey.source} ➔ {journey.destination}
                  </span>
                </div>
                <div className="bg-[#0e1424] p-1.5 rounded border border-gray-800/60">
                  <span className="text-gray-500 text-[10px] block">Priority</span>
                  <span className="font-bold">{getPriorityBadge(journey.priority)}</span>
                </div>
                <div className="bg-[#0e1424] p-1.5 rounded border border-gray-800/60">
                  <span className="text-gray-500 text-[10px] block">Hops Visited</span>
                  <span className="text-amber-300 font-bold">{journey.hop_count ?? 0}</span>
                  {(journey.reroute_count ?? 0) > 0 && (
                    <span className="ml-1 text-[9px] text-amber-400 bg-amber-950/40 px-1 rounded">
                      {journey.reroute_count} reroute{(journey.reroute_count ?? 0) > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="bg-[#0e1424] p-1.5 rounded border border-gray-800/60">
                  <span className="text-gray-500 text-[10px] block">
                    {journey.status === 'delivered' ? 'Total Latency' : 'Elapsed Sim Time'}
                  </span>
                  <span className="text-emerald-300 font-bold">
                    {journey.status === 'delivered' && journey.total_latency_ms !== null && journey.total_latency_ms !== undefined && !isNaN(Number(journey.total_latency_ms))
                      ? formatLatency(journey.total_latency_ms)
                      : journey.created_at_sim_time !== null && journey.created_at_sim_time !== undefined && !isNaN(Number(journey.created_at_sim_time))
                      ? `${(Number(journey.created_at_sim_time) / 1000).toFixed(2)}s`
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Current Position / Drop notice */}
              {journey.status === 'in_transit' && (
                <div className="bg-cyan-950/30 border border-cyan-500/40 rounded p-2 text-[11px] text-cyan-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    <span>In link transmission:</span>
                  </span>
                  <span className="font-mono font-bold text-cyan-300">
                    {journey.current_link_id || 'Link'} ➔ {journey.next_router || 'Router'}
                  </span>
                </div>
              )}

              {journey.status === 'processing' && (
                <div className="bg-purple-950/30 border border-purple-500/40 rounded p-2 text-[11px] text-purple-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-purple-400" />
                    <span>Processing at:</span>
                  </span>
                  <span className="font-mono font-bold text-purple-300">
                    Router {journey.current_router || 'N/A'}
                  </span>
                </div>
              )}

              {journey.status === 'queued' && (
                <div className="bg-amber-950/30 border border-amber-500/40 rounded p-2 text-[11px] text-amber-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>Buffered in queue:</span>
                  </span>
                  <span className="font-mono font-bold text-amber-300">
                    Router {journey.current_router || 'N/A'}
                  </span>
                </div>
              )}

              {journey.status === 'dropped' && (
                <div className="bg-rose-950/40 border border-rose-500/50 rounded p-2 text-[11px] text-rose-200 space-y-0.5">
                  <div className="flex items-center gap-1 font-bold text-rose-300">
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                    <span>Drop Reason: {journey.drop_reason ? String(journey.drop_reason).replace(/_/g, ' ') : 'Unknown'}</span>
                  </div>
                  <div className="text-[10px] text-rose-300/80">
                    Location: Router {journey.current_router || 'N/A'}
                  </div>
                </div>
              )}
            </div>

            {/* Route Comparison: Planned vs Traversed */}
            <div className="bg-[#141b2d] border border-[#1f293d] rounded-lg p-2.5 space-y-2">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                <span>Routing Analysis</span>
                {(journey.reroute_count ?? 0) > 0 && (
                  <span className="text-amber-400 font-mono text-[9px] flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Rerouted during flight
                  </span>
                )}
              </div>

              {/* Planned Route */}
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500">Planned Dijkstra Route:</span>
                <div className="flex flex-wrap items-center gap-1 font-mono text-[11px]">
                  {(journey.planned_route || []).map((r, idx, arr) => (
                    <React.Fragment key={idx}>
                      <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-semibold border border-gray-700">
                        {r}
                      </span>
                      {idx < arr.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-gray-500" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Traversed Route */}
              <div className="space-y-1 pt-1 border-t border-gray-800/60">
                <span className="text-[10px] text-gray-500">Actual Traversed Path:</span>
                <div className="flex flex-wrap items-center gap-1 font-mono text-[11px]">
                  {journey.traversed_route && journey.traversed_route.length > 0 ? (
                    journey.traversed_route.map((r, idx, arr) => (
                      <React.Fragment key={idx}>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-500/40">
                          {r}
                        </span>
                        {idx < arr.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-emerald-400" />
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <span className="text-gray-500 text-[10px]">None recorded yet</span>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Chronological Lifecycle Timeline */}
            <div className="bg-[#141b2d] border border-[#1f293d] rounded-lg p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  Chronological Lifecycle ({(journey.events || []).length} events)
                </span>
                <span className="text-[10px] font-mono text-gray-500">Sim Time Order</span>
              </div>

              <div className="relative pl-3 space-y-3 pt-1">
                {/* Vertical connecting line */}
                <div className="absolute top-2.5 bottom-2.5 left-4.5 w-0.5 bg-gray-800" />

                {(journey.events || []).map((ev, index) => {
                  const visuals = getEventVisuals(ev.stage, ev.event_type);
                  const stageText = (ev.stage || ev.event_type || 'EVENT').replace(/_/g, ' ');
                  const simTimeValue = ev.timestamp_sim_ms ?? ev.sim_time_ms;

                  return (
                    <div key={ev.id || index} className="relative flex items-start gap-2.5">
                      {/* Node circle */}
                      <div
                        className={`relative z-10 w-5 h-5 rounded-full bg-[#0d1322] border-2 ${visuals.borderColor} flex items-center justify-center shrink-0 shadow-sm`}
                      >
                        {visuals.icon}
                      </div>

                      {/* Content block */}
                      <div
                        className={`flex-1 rounded p-2 border ${visuals.borderColor}/30 ${visuals.bgColor} space-y-1 font-mono`}
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={`font-bold ${visuals.textColor} tracking-wider`}>
                            #{ev.sequence_num ?? index + 1} {stageText}
                          </span>
                          <span className="text-gray-400">
                            {formatSimTime(simTimeValue)}
                          </span>
                        </div>

                        <div className="text-[11px] text-gray-200 font-sans leading-tight">
                          {ev.message || ''}
                        </div>

                        {/* Extra event details pill if available */}
                        {ev.details && typeof ev.details === 'object' && Object.keys(ev.details).length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1 text-[9px] text-gray-400 font-mono">
                            {Object.entries(ev.details).map(([k, v]) => (
                              <span
                                key={k}
                                className="px-1 py-0.2 rounded bg-black/40 border border-gray-700/60"
                              >
                                {k}: <strong className="text-gray-300">{Array.isArray(v) ? v.join('➔') : String(v ?? '')}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

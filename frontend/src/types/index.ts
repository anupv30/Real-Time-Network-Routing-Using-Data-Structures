export type PacketPriority = 'critical' | 'high' | 'normal' | 'low';

export type PacketStatus = 'created' | 'queued' | 'processing' | 'in_transit' | 'delivered' | 'dropped';

export type DropReason = 'queue_overflow' | 'router_failed' | 'link_failed' | 'unreachable' | 'ttl_exceeded';

export interface PacketJourneyEvent {
  id?: string;
  packet_id?: string;
  event_type: string;
  stage: string;
  router_id?: string | null;
  link_id?: string | null;
  timestamp_sim_ms?: number;
  sim_time_ms?: number;
  sequence_num: number;
  message: string;
  details?: Record<string, any>;
}

export interface PacketJourneyDetails {
  packet_id: string;
  status: PacketStatus;
  source: string;
  destination: string;
  priority: PacketPriority;
  payload_size_bytes: number;
  created_at_sim_time: number;
  delivered_at_sim_time?: number | null;
  total_latency_ms?: number | null;
  hop_count: number;
  reroute_count: number;
  drop_reason?: string | null;
  current_router?: string | null;
  next_router?: string | null;
  current_link_id?: string | null;
  transit_progress: number;
  planned_route: string[];
  traversed_route: string[];
  events: PacketJourneyEvent[];
}

export interface RecentPacketSummary {
  id: string;
  source: string;
  destination: string;
  priority: PacketPriority;
  status: PacketStatus;
  created_at_sim_time: number;
  delivered_at_sim_time?: number | null;
  hop_count: number;
  drop_reason?: string | null;
}

export interface QueuedPacketInfo {
  id: string;
  priority: PacketPriority;
  source: string;
  destination: string;
  queue_position: number;
  payload_size_bytes?: number;
  hop_count?: number;
  created_at_sim_time?: number;
}

export interface ProcessingPacketInfo {
  id: string;
  priority: PacketPriority;
  source: string;
  destination: string;
  payload_size_bytes?: number;
  hop_count?: number;
  created_at_sim_time?: number;
  remaining_ms: number;
  progress: number;
  processing_delay_ms: number;
}

export interface RouterState {
  id: string;
  label: string;
  x: number;
  y: number;
  status: 'active' | 'congested' | 'failed';
  queue_capacity: number;
  processing_delay_ms: number;
  scheduling_policy: string;
  queue_len: number;
  queue_utilization_pct: number;
  priority_breakdown: Record<string, number>;
  total_processed: number;
  total_dropped: number;
  is_processing: boolean;
  queued_packets?: QueuedPacketInfo[];
  processing_packet?: ProcessingPacketInfo | null;
}

export interface LinkState {
  id: string;
  source: string;
  target: string;
  cost: number;
  latency_ms: number;
  bandwidth_mbps: number;
  status: 'active' | 'congested' | 'failed';
  in_flight_count: number;
  utilization_pct: number;
}

export interface InTransitPacketData {
  packet_id: string;
  source: string;
  target: string;
  link_id: string;
  priority: PacketPriority;
  progress: number; // 0.0 to 1.0
  route: string[];
  hop_count: number;
}

export interface SimulationMetrics {
  total_generated: number;
  total_delivered: number;
  total_dropped: number;
  in_transit: number;
  queued: number;
  delivery_ratio: number;
  loss_ratio: number;
  avg_latency_ms: number | null;
  min_latency_ms: number | null;
  max_latency_ms: number | null;
  throughput_pps: number;
  avg_hop_count: number | null;
  total_reroutes: number;
  elapsed_sim_time_sec: number;
  avg_queue_utilization_pct: number;
  active_routers_count: number;
  active_links_count: number;
}

export interface MetricSnapshot {
  timestamp_sim_sec: number;
  delivered_count: number;
  dropped_count: number;
  throughput_pps: number;
  avg_latency_ms: number;
  queue_utilization_pct: number;
  link_utilization_pct: number;
}

export interface EventLogItem {
  id: string;
  timestamp_sim_ms: number;
  event_type: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  router_id?: string;
  link_id?: string;
  packet_id?: string;
  message: string;
}

export interface SimulationStateSnapshot {
  state: 'stopped' | 'running' | 'paused';
  sim_time_ms: number;
  speed_multiplier: number;
  auto_generate: boolean;
  generation_rate_pps: number;
  gen_source: string;
  gen_destination: string;
  gen_priority: PacketPriority;
  routers: Record<string, RouterState>;
  links: Record<string, LinkState>;
  in_transit: InTransitPacketData[];
  metrics: SimulationMetrics;
  metric_snapshots: MetricSnapshot[];
  recent_events: EventLogItem[];
}

export interface DijkstraStep {
  step: number;
  action: string;
  current_node?: string;
  current_distance?: number;
  neighbor?: string;
  edge_cost?: number;
  old_distance?: number;
  new_distance?: number;
  relaxed: boolean;
  explanation: string;
  distances: Record<string, number>;
  settled_nodes: string[];
  heap_state: Array<[number, string]>;
}

export interface ShortestPathResult {
  source: string;
  destination: string;
  path: string[];
  total_cost: number;
  total_latency_ms: number;
  hops: number;
  links_used: string[];
  is_reachable: boolean;
  trace: DijkstraStep[];
}

export interface TopologySummary {
  id: string;
  name: string;
  description: string;
  is_builtin: boolean;
  created_at?: string;
}

export interface SimulationHistoryRecord {
  id: string;
  topology_name: string;
  packets_generated: number;
  packets_delivered: number;
  packets_dropped: number;
  avg_latency_ms: number;
  throughput_pps: number;
  duration_sec: number;
  created_at: string;
}

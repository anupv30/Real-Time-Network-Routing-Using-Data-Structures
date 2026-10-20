export type PacketPriority = 'critical' | 'high' | 'normal' | 'low';

export type PacketStatus = 'created' | 'queued' | 'in_transit' | 'delivered' | 'dropped';

export type DropReason = 'queue_overflow' | 'router_failed' | 'link_failed' | 'unreachable' | 'ttl_exceeded';

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

from typing import List, Optional, Dict
from pydantic import BaseModel, Field

class SimulationMetrics(BaseModel):
    total_generated: int = 0
    total_delivered: int = 0
    total_dropped: int = 0
    in_transit: int = 0
    queued: int = 0
    
    delivery_ratio: float = 0.0  # percentage
    loss_ratio: float = 0.0      # percentage
    
    avg_latency_ms: Optional[float] = None
    min_latency_ms: Optional[float] = None
    max_latency_ms: Optional[float] = None
    
    throughput_pps: float = 0.0  # packets/sec in current window
    avg_hop_count: Optional[float] = None
    total_reroutes: int = 0
    elapsed_sim_time_sec: float = 0.0
    
    avg_queue_utilization_pct: float = 0.0
    active_routers_count: int = 0
    active_links_count: int = 0

class EventLogItem(BaseModel):
    id: str
    timestamp_sim_ms: float
    event_type: str
    severity: str = "info"  # "info" | "warning" | "error" | "success"
    router_id: Optional[str] = None
    link_id: Optional[str] = None
    packet_id: Optional[str] = None
    message: str

class MetricSnapshot(BaseModel):
    timestamp_sim_sec: float
    delivered_count: int
    dropped_count: int
    throughput_pps: float
    avg_latency_ms: float
    queue_utilization_pct: float
    link_utilization_pct: float

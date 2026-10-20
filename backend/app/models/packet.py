import time
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

class PacketPriority(str, Enum):
    CRITICAL = "critical"  # Priority value 0
    HIGH = "high"          # Priority value 1
    NORMAL = "normal"      # Priority value 2
    LOW = "low"            # Priority value 3

PRIORITY_WEIGHTS = {
    PacketPriority.CRITICAL: 0,
    PacketPriority.HIGH: 1,
    PacketPriority.NORMAL: 2,
    PacketPriority.LOW: 3
}

class PacketStatus(str, Enum):
    CREATED = "created"
    QUEUED = "queued"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    DROPPED = "dropped"

class DropReason(str, Enum):
    QUEUE_OVERFLOW = "queue_overflow"
    ROUTER_FAILED = "router_failed"
    LINK_FAILED = "link_failed"
    UNREACHABLE = "unreachable"
    TTL_EXCEEDED = "ttl_exceeded"

class Packet(BaseModel):
    id: str
    source: str
    destination: str
    current_router: Optional[str] = None
    next_router: Optional[str] = None
    current_link_id: Optional[str] = None
    
    route: List[str] = Field(default_factory=list)
    current_route_index: int = 0
    
    priority: PacketPriority = PacketPriority.NORMAL
    payload_size_bytes: int = 1500
    
    # Timestamps (simulation milliseconds)
    created_at_sim_time: float = 0.0
    dispatched_at_sim_time: Optional[float] = None
    delivered_at_sim_time: Optional[float] = None
    
    # Live status
    status: PacketStatus = PacketStatus.CREATED
    hop_count: int = 0
    accumulated_latency_ms: float = 0.0
    drop_reason: Optional[DropReason] = None
    reroute_count: int = 0
    
    # Transit progress (0.0 to 1.0 along current link)
    transit_progress: float = 0.0
    transit_start_sim_time: Optional[float] = None
    transit_duration_ms: float = 0.0

class InTransitPacket(BaseModel):
    packet: Packet
    link_id: str
    source_router: str
    target_router: str
    start_sim_time: float
    end_sim_time: float

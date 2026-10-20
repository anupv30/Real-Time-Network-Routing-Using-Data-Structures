from typing import Dict, List, Optional
from pydantic import BaseModel, Field

class RouterNode(BaseModel):
    id: str
    label: str
    x: float = 0.0
    y: float = 0.0
    status: str = "active"  # "active" | "congested" | "failed"
    queue_capacity: int = 15
    processing_delay_ms: float = 30.0  # Time router takes to process one packet
    scheduling_policy: str = "fifo"    # "fifo" | "priority"
    
    # Live stats
    current_queue_len: int = 0
    total_processed: int = 0
    total_dropped: int = 0

class NetworkLink(BaseModel):
    id: str
    source: str
    target: str
    latency_ms: float = 80.0
    bandwidth_mbps: float = 100.0
    cost: float = 1.0  # Routing metric (can be equal to latency or admin cost)
    status: str = "active"  # "active" | "congested" | "failed"
    in_flight_count: int = 0
    utilization_pct: float = 0.0

class NetworkTopology(BaseModel):
    id: str = "default"
    name: str = "Network Topology"
    description: str = ""
    routers: Dict[str, RouterNode] = Field(default_factory=dict)
    links: Dict[str, NetworkLink] = Field(default_factory=dict)

    def get_adjacency_list(self, include_failed: bool = False) -> Dict[str, List[tuple]]:
        """
        Builds adjacency list: {router_id: [(neighbor_id, link_cost, link_id, link_latency), ...]}
        If include_failed is False, skips failed routers and failed links.
        """
        adj: Dict[str, List[tuple]] = {r_id: [] for r_id in self.routers}
        
        for link in self.links.values():
            if not include_failed:
                if link.status == "failed":
                    continue
                src_router = self.routers.get(link.source)
                dst_router = self.routers.get(link.target)
                if not src_router or not dst_router:
                    continue
                if src_router.status == "failed" or dst_router.status == "failed":
                    continue
            
            # Undirected link support (bidirectional packets can flow either direction)
            adj.setdefault(link.source, []).append((link.target, link.cost, link.id, link.latency_ms))
            adj.setdefault(link.target, []).append((link.source, link.cost, link.id, link.latency_ms))
            
        return adj

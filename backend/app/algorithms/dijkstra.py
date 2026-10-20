import heapq
from typing import Dict, List, Optional, Tuple, Any
from pydantic import BaseModel, Field
from app.models.graph import NetworkTopology

class DijkstraStep(BaseModel):
    step: int
    action: str  # "EXTRACT_MIN", "EVALUATE_EDGE", "RELAX_EDGE", "ALREADY_SETTLED", "REACHED_DEST"
    current_node: Optional[str] = None
    current_distance: Optional[float] = None
    neighbor: Optional[str] = None
    edge_cost: Optional[float] = None
    old_distance: Optional[float] = None
    new_distance: Optional[float] = None
    relaxed: bool = False
    explanation: str
    distances: Dict[str, float]
    settled_nodes: List[str]
    heap_state: List[Tuple[float, str]]

class ShortestPathResult(BaseModel):
    source: str
    destination: str
    path: List[str]
    total_cost: float
    total_latency_ms: float
    hops: int
    links_used: List[str]
    is_reachable: bool
    trace: List[DijkstraStep] = Field(default_factory=list)

def dijkstra_shortest_path(
    topology: NetworkTopology,
    source: str,
    destination: str,
    record_trace: bool = True
) -> ShortestPathResult:
    """
    Computes Dijkstra's shortest path from source to destination using a binary min-heap.
    
    Time Complexity: O((V + E) log V) where V = routers, E = links.
    Space Complexity: O(V + E) for adjacency list, distances, parent pointers, and heap.
    
    Excludes failed routers and links.
    """
    # Validation checks
    if source not in topology.routers or destination not in topology.routers:
        return ShortestPathResult(
            source=source,
            destination=destination,
            path=[],
            total_cost=float("inf"),
            total_latency_ms=0.0,
            hops=0,
            links_used=[],
            is_reachable=False,
            trace=[]
        )
    
    src_router = topology.routers[source]
    dst_router = topology.routers[destination]
    
    if src_router.status == "failed" or dst_router.status == "failed":
        return ShortestPathResult(
            source=source,
            destination=destination,
            path=[],
            total_cost=float("inf"),
            total_latency_ms=0.0,
            hops=0,
            links_used=[],
            is_reachable=False,
            trace=[]
        )

    # Edge case: Source is destination
    if source == destination:
        return ShortestPathResult(
            source=source,
            destination=destination,
            path=[source],
            total_cost=0.0,
            total_latency_ms=0.0,
            hops=0,
            links_used=[],
            is_reachable=True,
            trace=[]
        )

    # Build adjacency list excluding failed elements
    adj = topology.get_adjacency_list(include_failed=False)
    
    # Dijkstra structures
    distances: Dict[str, float] = {r_id: float("inf") for r_id in topology.routers if topology.routers[r_id].status != "failed"}
    distances[source] = 0.0
    
    previous_node: Dict[str, Optional[str]] = {r_id: None for r_id in distances}
    link_used_map: Dict[str, Optional[str]] = {r_id: None for r_id in distances}
    latency_to_node: Dict[str, float] = {r_id: float("inf") for r_id in distances}
    latency_to_node[source] = 0.0

    # Binary min-heap: (distance, node_id)
    pq: List[Tuple[float, str]] = [(0.0, source)]
    settled: set = set()
    trace: List[DijkstraStep] = []
    step_counter = 0

    if record_trace:
        step_counter += 1
        trace.append(DijkstraStep(
            step=step_counter,
            action="INITIALIZE",
            current_node=source,
            current_distance=0.0,
            explanation=f"Initialized source node {source} with distance 0.0, all other nodes with infinity.",
            distances={k: (v if v != float('inf') else -1.0) for k, v in distances.items()},
            settled_nodes=list(settled),
            heap_state=list(pq)
        ))

    while pq:
        curr_dist, u = heapq.heappop(pq)

        if u in settled:
            continue
        
        settled.add(u)

        if record_trace:
            step_counter += 1
            trace.append(DijkstraStep(
                step=step_counter,
                action="EXTRACT_MIN",
                current_node=u,
                current_distance=curr_dist,
                explanation=f"Extracted minimum distance node {u} with cumulative cost {curr_dist:.2f}.",
                distances={k: (v if v != float('inf') else -1.0) for k, v in distances.items()},
                settled_nodes=list(settled),
                heap_state=list(pq)
            ))

        if u == destination:
            if record_trace:
                step_counter += 1
                trace.append(DijkstraStep(
                    step=step_counter,
                    action="REACHED_DEST",
                    current_node=u,
                    current_distance=curr_dist,
                    explanation=f"Reached destination node {u}. Shortest path search complete.",
                    distances={k: (v if v != float('inf') else -1.0) for k, v in distances.items()},
                    settled_nodes=list(settled),
                    heap_state=list(pq)
                ))
            break

        # Explore outgoing edges
        for v, link_cost, link_id, link_latency in adj.get(u, []):
            if v in settled:
                continue
            
            # Non-negative weight validation
            weight = max(0.0, float(link_cost))
            alt_dist = curr_dist + weight

            if record_trace:
                step_counter += 1
                old_d = distances.get(v, float("inf"))
                trace.append(DijkstraStep(
                    step=step_counter,
                    action="EVALUATE_EDGE",
                    current_node=u,
                    current_distance=curr_dist,
                    neighbor=v,
                    edge_cost=weight,
                    old_distance=(old_d if old_d != float('inf') else -1.0),
                    new_distance=alt_dist,
                    relaxed=(alt_dist < distances[v]),
                    explanation=f"Checking edge ({u} -> {v}) with cost {weight:.2f}. Path via {u} = {alt_dist:.2f}.",
                    distances={k: (v_d if v_d != float('inf') else -1.0) for k, v_d in distances.items()},
                    settled_nodes=list(settled),
                    heap_state=list(pq)
                ))

            if alt_dist < distances[v]:
                old_v_dist = distances[v]
                distances[v] = alt_dist
                previous_node[v] = u
                link_used_map[v] = link_id
                latency_to_node[v] = latency_to_node[u] + link_latency
                heapq.heappush(pq, (alt_dist, v))

                if record_trace:
                    step_counter += 1
                    trace.append(DijkstraStep(
                        step=step_counter,
                        action="RELAX_EDGE",
                        current_node=u,
                        current_distance=curr_dist,
                        neighbor=v,
                        edge_cost=weight,
                        old_distance=(old_v_dist if old_v_dist != float('inf') else -1.0),
                        new_distance=alt_dist,
                        relaxed=True,
                        explanation=f"Relaxed edge to {v}. Updated shortest distance to {alt_dist:.2f} and pushed to min-heap.",
                        distances={k: (v_d if v_d != float('inf') else -1.0) for k, v_d in distances.items()},
                        settled_nodes=list(settled),
                        heap_state=list(pq)
                    ))

    # Reconstruct path
    if distances.get(destination, float("inf")) == float("inf"):
        return ShortestPathResult(
            source=source,
            destination=destination,
            path=[],
            total_cost=float("inf"),
            total_latency_ms=0.0,
            hops=0,
            links_used=[],
            is_reachable=False,
            trace=trace
        )

    path: List[str] = []
    links_used: List[str] = []
    curr: Optional[str] = destination
    
    while curr is not None:
        path.append(curr)
        link_id = link_used_map.get(curr)
        if link_id:
            links_used.append(link_id)
        curr = previous_node.get(curr)
        
    path.reverse()
    links_used.reverse()

    return ShortestPathResult(
        source=source,
        destination=destination,
        path=path,
        total_cost=distances[destination],
        total_latency_ms=latency_to_node.get(destination, 0.0),
        hops=len(path) - 1,
        links_used=links_used,
        is_reachable=True,
        trace=trace
    )

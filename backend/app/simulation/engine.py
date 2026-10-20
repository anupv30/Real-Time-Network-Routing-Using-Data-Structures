import asyncio
import logging
import time
import uuid
from typing import Dict, List, Optional, Callable, Any
from app.config import settings
from app.models.graph import NetworkTopology, RouterNode, NetworkLink
from app.models.packet import Packet, PacketPriority, PacketStatus, DropReason, InTransitPacket
from app.models.metrics import SimulationMetrics, EventLogItem, MetricSnapshot
from app.simulation.queue import RouterQueue
from app.algorithms.dijkstra import dijkstra_shortest_path
from app.simulation.topologies import BUILTIN_TOPOLOGIES

logger = logging.getLogger(__name__)

class SimulationEngine:
    def __init__(self, topology: Optional[NetworkTopology] = None):
        if topology is None:
            topology = BUILTIN_TOPOLOGIES["small"]()
            
        self.topology: NetworkTopology = topology
        self.state: str = "stopped"  # "stopped", "running", "paused"
        
        # Simulation clock
        self.sim_time_ms: float = 0.0
        self.tick_rate_ms: float = float(settings.DEFAULT_TICK_RATE_MS)
        self.speed_multiplier: float = 1.0
        self.last_tick_wall_time: float = 0.0
        
        # Packet Generator config
        self.auto_generate: bool = True
        self.generation_rate_pps: float = 2.0  # Packets per second
        self.last_generation_sim_time: float = 0.0
        self.gen_source: str = list(self.topology.routers.keys())[0] if self.topology.routers else ""
        self.gen_destination: str = list(self.topology.routers.keys())[-1] if self.topology.routers else ""
        self.gen_priority: PacketPriority = PacketPriority.NORMAL
        
        # Router Queues: router_id -> RouterQueue
        self.queues: Dict[str, RouterQueue] = {}
        self._init_queues()
        
        # Packets in transit on links
        self.in_transit_packets: List[InTransitPacket] = []
        
        # Packet registry: packet_id -> Packet (keep last 500 for inspection)
        self.packets_history: Dict[str, Packet] = {}
        
        # Events & Metrics
        self.event_log: List[EventLogItem] = []
        self.metrics: SimulationMetrics = SimulationMetrics()
        self.metric_snapshots: List[MetricSnapshot] = []
        self.recent_delivered_timestamps: List[float] = []  # for throughput window
        self.total_delivered_latency_ms: float = 0.0
        
        # Callbacks for WebSocket broadcasting
        self.broadcast_callback: Optional[Callable[[Dict[str, Any]], Any]] = None
        
        # Background task handle
        self._sim_task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()

    def _init_queues(self):
        self.queues = {}
        for r_id, router in self.topology.routers.items():
            self.queues[r_id] = RouterQueue(
                router_id=r_id,
                capacity=router.queue_capacity,
                scheduling_policy=router.scheduling_policy
            )

    def set_broadcast_callback(self, callback: Callable[[Dict[str, Any]], Any]):
        self.broadcast_callback = callback

    def log_event(
        self,
        event_type: str,
        message: str,
        severity: str = "info",
        router_id: Optional[str] = None,
        link_id: Optional[str] = None,
        packet_id: Optional[str] = None
    ):
        event = EventLogItem(
            id=str(uuid.uuid4())[:8],
            timestamp_sim_ms=round(self.sim_time_ms, 1),
            event_type=event_type,
            severity=severity,
            router_id=router_id,
            link_id=link_id,
            packet_id=packet_id,
            message=message
        )
        self.event_log.append(event)
        if len(self.event_log) > 200:
            self.event_log.pop(0)

    def load_topology(self, new_topology: NetworkTopology):
        self.stop()
        self.topology = new_topology
        self._init_queues()
        self.in_transit_packets.clear()
        self.packets_history.clear()
        self.event_log.clear()
        self.metrics = SimulationMetrics()
        self.metric_snapshots.clear()
        self.recent_delivered_timestamps.clear()
        self.total_delivered_latency_ms = 0.0
        self.sim_time_ms = 0.0
        self.last_generation_sim_time = 0.0
        
        if self.topology.routers:
            r_keys = list(self.topology.routers.keys())
            self.gen_source = r_keys[0]
            self.gen_destination = r_keys[-1]
            
        self.log_event("topology.loaded", f"Loaded topology '{new_topology.name}' with {len(new_topology.routers)} routers and {len(new_topology.links)} links.", "info")

    def create_packet(
        self,
        source: str,
        destination: str,
        priority: PacketPriority = PacketPriority.NORMAL,
        payload_size: int = 1500
    ) -> Optional[Packet]:
        if source not in self.topology.routers or destination not in self.topology.routers:
            self.log_event("packet.error", f"Cannot create packet: invalid endpoints ({source} -> {destination})", "error")
            return None
            
        # Calculate initial path using Dijkstra
        path_res = dijkstra_shortest_path(self.topology, source, destination, record_trace=False)
        
        pkt_id = f"PKT-{str(uuid.uuid4())[:6].upper()}"
        pkt = Packet(
            id=pkt_id,
            source=source,
            destination=destination,
            current_router=source,
            priority=priority,
            payload_size_bytes=payload_size,
            created_at_sim_time=self.sim_time_ms,
            status=PacketStatus.CREATED,
            route=path_res.path,
            current_route_index=0
        )
        
        self.metrics.total_generated += 1
        self.packets_history[pkt_id] = pkt
        if len(self.packets_history) > 500:
            self.packets_history.pop(next(iter(self.packets_history)))
        
        if not path_res.is_reachable or len(path_res.path) == 0:
            pkt.status = PacketStatus.DROPPED
            pkt.drop_reason = DropReason.UNREACHABLE
            self.metrics.total_dropped += 1
            self.log_event("packet.dropped", f"Packet {pkt_id} dropped: Destination {destination} unreachable from {source}.", "error", router_id=source, packet_id=pkt_id)
            return pkt

        # Try to enqueue into source router
        q = self.queues.get(source)
        if q and self.topology.routers[source].status != "failed":
            enqueued = q.enqueue(pkt)
            if enqueued:
                self.log_event("packet.queued", f"Packet {pkt_id} [{priority.value.upper()}] enqueued at source router {source}.", "info", router_id=source, packet_id=pkt_id)
            else:
                self.metrics.total_dropped += 1
                self.log_event("packet.dropped", f"Packet {pkt_id} dropped at {source}: Tail drop (queue full {q.size()}/{q.capacity}).", "warning", router_id=source, packet_id=pkt_id)
        else:
            pkt.status = PacketStatus.DROPPED
            pkt.drop_reason = DropReason.ROUTER_FAILED
            self.metrics.total_dropped += 1
            self.log_event("packet.dropped", f"Packet {pkt_id} dropped: Source router {source} is offline/failed.", "error", router_id=source, packet_id=pkt_id)

        return pkt

    def fail_router(self, router_id: str):
        if router_id in self.topology.routers:
            router = self.topology.routers[router_id]
            router.status = "failed"
            q = self.queues.get(router_id)
            dropped = []
            if q:
                dropped = q.clear()
                self.metrics.total_dropped += len(dropped)
            self.log_event("router.failed", f"Router {router_id} FAILED! Dropped {len(dropped)} queued packets.", "error", router_id=router_id)
            # Reroute eligible in-flight packets heading toward this router
            self._reroute_affected_packets()

    def restore_router(self, router_id: str):
        if router_id in self.topology.routers:
            self.topology.routers[router_id].status = "active"
            self.log_event("router.restored", f"Router {router_id} restored to healthy status.", "success", router_id=router_id)

    def fail_link(self, link_id: str):
        if link_id in self.topology.links:
            self.topology.links[link_id].status = "failed"
            self.log_event("link.failed", f"Link {link_id} FAILED!", "error", link_id=link_id)
            # Handle in-transit packets on this link
            surviving_in_transit = []
            for item in self.in_transit_packets:
                if item.link_id == link_id:
                    item.packet.status = PacketStatus.DROPPED
                    item.packet.drop_reason = DropReason.LINK_FAILED
                    self.metrics.total_dropped += 1
                    self.log_event("packet.dropped", f"Packet {item.packet.id} dropped: In transit on failed link {link_id}.", "error", link_id=link_id, packet_id=item.packet.id)
                else:
                    surviving_in_transit.append(item)
            self.in_transit_packets = surviving_in_transit
            self._reroute_affected_packets()

    def restore_link(self, link_id: str):
        if link_id in self.topology.links:
            self.topology.links[link_id].status = "active"
            self.log_event("link.restored", f"Link {link_id} restored to operational status.", "success", link_id=link_id)

    def congest_router(self, router_id: str, delay_multiplier: float = 3.0):
        if router_id in self.topology.routers:
            router = self.topology.routers[router_id]
            if router.status != "congested":
                router.status = "congested"
                router.processing_delay_ms *= delay_multiplier
                self.log_event("router.congested", f"Router {router_id} is CONGESTED. Processing delay increased to {router.processing_delay_ms:.1f}ms.", "warning", router_id=router_id)
            else:
                router.status = "active"
                router.processing_delay_ms /= delay_multiplier
                self.log_event("router.normal", f"Router {router_id} congestion cleared. Processing delay restored to {router.processing_delay_ms:.1f}ms.", "info", router_id=router_id)

    def congest_link(self, link_id: str, latency_multiplier: float = 4.0):
        if link_id in self.topology.links:
            link = self.topology.links[link_id]
            if link.status != "congested":
                link.status = "congested"
                link.latency_ms *= latency_multiplier
                link.cost *= latency_multiplier
                self.log_event("link.congested", f"Link {link_id} CONGESTED. Latency increased to {link.latency_ms:.1f}ms.", "warning", link_id=link_id)
            else:
                link.status = "active"
                link.latency_ms /= latency_multiplier
                link.cost /= latency_multiplier
                self.log_event("link.normal", f"Link {link_id} congestion cleared. Latency restored to {link.latency_ms:.1f}ms.", "info", link_id=link_id)

    def _reroute_affected_packets(self):
        """
        Dynamically recalculates routes for queued packets whose remaining path is blocked.
        """
        for r_id, q in self.queues.items():
            if self.topology.routers[r_id].status == "failed":
                continue
            for pkt in q.get_queued_packets():
                # Check if current remaining route is still intact
                remaining_route = pkt.route[pkt.current_route_index:]
                needs_reroute = False
                for node in remaining_route:
                    if self.topology.routers.get(node, RouterNode(id="", label="")).status == "failed":
                        needs_reroute = True
                        break
                
                if needs_reroute:
                    res = dijkstra_shortest_path(self.topology, r_id, pkt.destination, record_trace=False)
                    if res.is_reachable and len(res.path) > 0:
                        pkt.route = pkt.route[:pkt.current_route_index] + res.path
                        pkt.reroute_count += 1
                        self.metrics.total_reroutes += 1
                        self.log_event("packet.rerouted", f"Packet {pkt.id} rerouted at {r_id} via {res.path}.", "warning", router_id=r_id, packet_id=pkt.id)
                    else:
                        # Destination unreachable
                        pkt.status = PacketStatus.DROPPED
                        pkt.drop_reason = DropReason.UNREACHABLE
                        self.metrics.total_dropped += 1
                        self.log_event("packet.dropped", f"Packet {pkt.id} dropped at {r_id}: No alternative route to {pkt.destination}.", "error", router_id=r_id, packet_id=pkt.id)

    def _find_link(self, u: str, v: str) -> Optional[NetworkLink]:
        for link in self.topology.links.values():
            if (link.source == u and link.target == v) or (link.source == v and link.target == u):
                return link
        return None

    def tick(self, delta_sim_ms: float):
        """Advances the simulation state by delta_sim_ms milliseconds."""
        self.sim_time_ms += delta_sim_ms

        # 1. Packet Auto-Generation
        if self.auto_generate and self.generation_rate_pps > 0:
            gen_interval_ms = 1000.0 / self.generation_rate_pps
            if (self.sim_time_ms - self.last_generation_sim_time) >= gen_interval_ms:
                self.create_packet(
                    source=self.gen_source,
                    destination=self.gen_destination,
                    priority=self.gen_priority
                )
                self.last_generation_sim_time = self.sim_time_ms

        # 2. Advance In-Transit Packets along Links
        arrived_transit: List[InTransitPacket] = []
        remaining_transit: List[InTransitPacket] = []

        for item in self.in_transit_packets:
            pkt = item.packet
            total_dur = max(1.0, item.end_sim_time - item.start_sim_time)
            elapsed = self.sim_time_ms - item.start_sim_time
            pkt.transit_progress = min(1.0, max(0.0, elapsed / total_dur))
            pkt.accumulated_latency_ms += delta_sim_ms

            if self.sim_time_ms >= item.end_sim_time:
                arrived_transit.append(item)
            else:
                remaining_transit.append(item)

        self.in_transit_packets = remaining_transit

        # Process arrived packets at target routers
        for item in arrived_transit:
            pkt = item.packet
            target_router_id = item.target_router
            pkt.current_router = target_router_id
            pkt.current_route_index += 1
            pkt.hop_count += 1
            pkt.transit_progress = 0.0
            pkt.current_link_id = None

            target_router = self.topology.routers.get(target_router_id)
            if not target_router or target_router.status == "failed":
                pkt.status = PacketStatus.DROPPED
                pkt.drop_reason = DropReason.ROUTER_FAILED
                self.metrics.total_dropped += 1
                self.log_event("packet.dropped", f"Packet {pkt.id} dropped: Target router {target_router_id} is failed.", "error", router_id=target_router_id, packet_id=pkt.id)
                continue

            # Check if this target router is the final destination!
            if target_router_id == pkt.destination:
                pkt.status = PacketStatus.DELIVERED
                pkt.delivered_at_sim_time = self.sim_time_ms
                total_latency = self.sim_time_ms - pkt.created_at_sim_time
                self.total_delivered_latency_ms += total_latency
                self.recent_delivered_timestamps.append(self.sim_time_ms)
                self.metrics.total_delivered += 1
                self.metrics.avg_latency_ms = round(
                    self.total_delivered_latency_ms / self.metrics.total_delivered, 1
                )
                self.metrics.min_latency_ms = (
                    total_latency
                    if self.metrics.min_latency_ms is None
                    else min(self.metrics.min_latency_ms, total_latency)
                )
                self.metrics.max_latency_ms = (
                    total_latency
                    if self.metrics.max_latency_ms is None
                    else max(self.metrics.max_latency_ms, total_latency)
                )
                target_router.total_processed += 1
                self.log_event("packet.delivered", f"Packet {pkt.id} DELIVERED to {pkt.destination} in {total_latency:.1f}ms across {pkt.hop_count} hops.", "success", router_id=target_router_id, packet_id=pkt.id)
                continue

            # Otherwise, enqueue into target router for further forwarding
            q = self.queues.get(target_router_id)
            if q:
                enqueued = q.enqueue(pkt)
                if enqueued:
                    self.log_event("packet.queued", f"Packet {pkt.id} arrived and queued at {target_router_id}.", "info", router_id=target_router_id, packet_id=pkt.id)
                else:
                    self.metrics.total_dropped += 1
                    self.log_event("packet.dropped", f"Packet {pkt.id} dropped at {target_router_id}: Tail drop (buffer overflow).", "warning", router_id=target_router_id, packet_id=pkt.id)

        # 3. Router Queue Processing & Packet Forwarding
        for r_id, router in self.topology.routers.items():
            if router.status == "failed":
                continue

            q = self.queues.get(r_id)
            if not q:
                continue

            # If router is currently processing a packet
            if q.is_processing and q.current_processing_packet:
                if self.sim_time_ms >= (q.processing_finish_sim_time or 0.0):
                    # Packet processing complete at this router!
                    finished_pkt = q.current_processing_packet
                    q.is_processing = False
                    q.current_processing_packet = None
                    q.processing_finish_sim_time = None
                    router.total_processed += 1

                    # Forward to next hop
                    if finished_pkt.current_route_index + 1 < len(finished_pkt.route):
                        next_router_id = finished_pkt.route[finished_pkt.current_route_index + 1]
                        link = self._find_link(r_id, next_router_id)

                        # Check if link or next router failed
                        next_router = self.topology.routers.get(next_router_id)
                        link_failed = (not link or link.status == "failed")
                        next_failed = (not next_router or next_router.status == "failed")

                        if link_failed or next_failed:
                            # Dynamic Reroute!
                            reroute_res = dijkstra_shortest_path(self.topology, r_id, finished_pkt.destination, record_trace=False)
                            if reroute_res.is_reachable and len(reroute_res.path) > 1:
                                finished_pkt.route = finished_pkt.route[:finished_pkt.current_route_index] + reroute_res.path
                                next_router_id = finished_pkt.route[finished_pkt.current_route_index + 1]
                                link = self._find_link(r_id, next_router_id)
                                finished_pkt.reroute_count += 1
                                self.metrics.total_reroutes += 1
                                self.log_event("packet.rerouted", f"Packet {finished_pkt.id} rerouted from {r_id} to new path: {reroute_res.path}.", "warning", router_id=r_id, packet_id=finished_pkt.id)
                            else:
                                finished_pkt.status = PacketStatus.DROPPED
                                finished_pkt.drop_reason = DropReason.LINK_FAILED if link_failed else DropReason.ROUTER_FAILED
                                self.metrics.total_dropped += 1
                                self.log_event("packet.dropped", f"Packet {finished_pkt.id} dropped at {r_id}: No alternative route to destination.", "error", router_id=r_id, packet_id=finished_pkt.id)
                                continue

                        if link:
                            # Dispatch packet onto link
                            finished_pkt.status = PacketStatus.IN_TRANSIT
                            finished_pkt.current_link_id = link.id
                            finished_pkt.next_router = next_router_id
                            finished_pkt.transit_start_sim_time = self.sim_time_ms
                            finished_pkt.transit_duration_ms = link.latency_ms
                            finished_pkt.transit_progress = 0.0

                            in_transit_item = InTransitPacket(
                                packet=finished_pkt,
                                link_id=link.id,
                                source_router=r_id,
                                target_router=next_router_id,
                                start_sim_time=self.sim_time_ms,
                                end_sim_time=self.sim_time_ms + link.latency_ms
                            )
                            self.in_transit_packets.append(in_transit_item)
                            self.log_event("packet.forwarded", f"Packet {finished_pkt.id} forwarded from {r_id} onto link {link.id} -> {next_router_id}.", "info", router_id=r_id, link_id=link.id, packet_id=finished_pkt.id)

            # If router is idle and queue has packets, start processing next packet
            if not q.is_processing and q.size() > 0:
                next_pkt = q.dequeue()
                if next_pkt:
                    q.is_processing = True
                    q.current_processing_packet = next_pkt
                    q.processing_finish_sim_time = self.sim_time_ms + router.processing_delay_ms

            # Sync router stats
            router.current_queue_len = q.size()
            router.total_dropped = q.total_dropped

        # 4. Update Metrics
        self._update_metrics()

    def _update_metrics(self):
        # Queued packets total
        total_queued = sum(q.size() for q in self.queues.values())
        self.metrics.queued = total_queued
        self.metrics.in_transit = len(self.in_transit_packets)
        
        # Delivery & Loss Ratios
        gen = self.metrics.total_generated
        if gen > 0:
            self.metrics.delivery_ratio = round((self.metrics.total_delivered / gen) * 100.0, 1)
            self.metrics.loss_ratio = round((self.metrics.total_dropped / gen) * 100.0, 1)
        else:
            self.metrics.delivery_ratio = 0.0
            self.metrics.loss_ratio = 0.0

        # Throughput in packets per second (last 5 seconds window)
        window_size_ms = 5000.0
        cutoff = self.sim_time_ms - window_size_ms
        self.recent_delivered_timestamps = [t for t in self.recent_delivered_timestamps if t >= cutoff]
        if self.sim_time_ms > 0:
            window_sec = min(self.sim_time_ms / 1000.0, window_size_ms / 1000.0)
            self.metrics.throughput_pps = round(len(self.recent_delivered_timestamps) / max(0.5, window_sec), 2)
        else:
            self.metrics.throughput_pps = 0.0

        # Average queue utilization
        if self.queues:
            total_util = sum(q.utilization_pct() for q in self.queues.values())
            self.metrics.avg_queue_utilization_pct = round(total_util / len(self.queues), 1)
        
        self.metrics.elapsed_sim_time_sec = round(self.sim_time_ms / 1000.0, 1)
        self.metrics.active_routers_count = sum(1 for r in self.topology.routers.values() if r.status != "failed")
        self.metrics.active_links_count = sum(1 for l in self.topology.links.values() if l.status != "failed")

        # Link in-flight counts and utilization
        link_counts: Dict[str, int] = {}
        for item in self.in_transit_packets:
            link_counts[item.link_id] = link_counts.get(item.link_id, 0) + 1
        
        for l_id, link in self.topology.links.items():
            link.in_flight_count = link_counts.get(l_id, 0)
            # Link utilization estimation
            link.utilization_pct = min(100.0, (link.in_flight_count / max(1, link.bandwidth_mbps / 20.0)) * 100.0)

        # Periodic time-series metric snapshot (every ~1 sim sec)
        current_sim_sec = round(self.sim_time_ms / 1000.0, 1)
        if not self.metric_snapshots or (current_sim_sec - self.metric_snapshots[-1].timestamp_sim_sec >= 1.0):
            snap = MetricSnapshot(
                timestamp_sim_sec=current_sim_sec,
                delivered_count=self.metrics.total_delivered,
                dropped_count=self.metrics.total_dropped,
                throughput_pps=self.metrics.throughput_pps,
                avg_latency_ms=self.metrics.avg_latency_ms or 0.0,
                queue_utilization_pct=self.metrics.avg_queue_utilization_pct,
                link_utilization_pct=round(sum(l.utilization_pct for l in self.topology.links.values()) / max(1, len(self.topology.links)), 1)
            )
            self.metric_snapshots.append(snap)
            if len(self.metric_snapshots) > 60:
                self.metric_snapshots.pop(0)

    def get_state_snapshot(self) -> Dict[str, Any]:
        """Compact serialized snapshot for WebSocket/REST synchronization."""
        # Router summary with queue states
        router_states = {}
        for r_id, router in self.topology.routers.items():
            q = self.queues.get(r_id)
            router_states[r_id] = {
                "id": r_id,
                "label": router.label,
                "x": router.x,
                "y": router.y,
                "status": router.status,
                "queue_capacity": router.queue_capacity,
                "processing_delay_ms": router.processing_delay_ms,
                "scheduling_policy": router.scheduling_policy,
                "queue_len": q.size() if q else 0,
                "queue_utilization_pct": round(q.utilization_pct(), 1) if q else 0.0,
                "priority_breakdown": q.get_priority_breakdown() if q else {},
                "total_processed": router.total_processed,
                "total_dropped": router.total_dropped,
                "is_processing": q.is_processing if q else False,
            }

        # Link summary
        link_states = {}
        for l_id, link in self.topology.links.items():
            link_states[l_id] = {
                "id": l_id,
                "source": link.source,
                "target": link.target,
                "cost": link.cost,
                "latency_ms": link.latency_ms,
                "bandwidth_mbps": link.bandwidth_mbps,
                "status": link.status,
                "in_flight_count": link.in_flight_count,
                "utilization_pct": round(link.utilization_pct, 1),
            }

        # In-transit packets
        transit_data = [
            {
                "packet_id": item.packet.id,
                "source": item.source_router,
                "target": item.target_router,
                "link_id": item.link_id,
                "priority": item.packet.priority.value,
                "progress": round(item.packet.transit_progress, 3),
                "route": item.packet.route,
                "hop_count": item.packet.hop_count
            }
            for item in self.in_transit_packets
        ]

        return {
            "state": self.state,
            "sim_time_ms": round(self.sim_time_ms, 1),
            "speed_multiplier": self.speed_multiplier,
            "auto_generate": self.auto_generate,
            "generation_rate_pps": self.generation_rate_pps,
            "gen_source": self.gen_source,
            "gen_destination": self.gen_destination,
            "gen_priority": self.gen_priority.value,
            "routers": router_states,
            "links": link_states,
            "in_transit": transit_data,
            "metrics": self.metrics.model_dump(),
            "metric_snapshots": [s.model_dump() for s in self.metric_snapshots[-25:]],
            "recent_events": [e.model_dump() for e in self.event_log[-20:]]
        }

    async def _run_loop(self):
        """Asynchronous simulation loop executing controlled ticks."""
        self.last_tick_wall_time = time.monotonic()
        while self.state == "running":
            now = time.monotonic()
            real_delta_ms = (now - self.last_tick_wall_time) * 1000.0
            self.last_tick_wall_time = now

            # Simulation delta scaled by speed multiplier
            sim_delta_ms = min(200.0, real_delta_ms * self.speed_multiplier)
            if sim_delta_ms > 0:
                try:
                    self.tick(sim_delta_ms)
                except Exception:
                    self.state = "paused"
                    self._sim_task = None
                    self.log_event(
                        "simulation.error",
                        "Simulation paused because an error occurred while advancing a tick.",
                        "error",
                    )
                    logger.exception("Simulation loop failed while advancing a tick.")
                    return

            # Broadcast update if callback set
            if self.broadcast_callback:
                try:
                    await self.broadcast_callback(self.get_state_snapshot())
                except Exception as e:
                    pass

            # Sleep for tick interval in real time
            sleep_time = (self.tick_rate_ms / 1000.0) / max(0.1, self.speed_multiplier)
            await asyncio.sleep(max(0.01, min(sleep_time, 0.1)))

    def start(self):
        if self.state == "running":
            return
        self.state = "running"
        self.last_tick_wall_time = time.monotonic()
        self.log_event("simulation.started", "Simulation engine started.", "info")
        try:
            loop = asyncio.get_running_loop()
            self._sim_task = loop.create_task(self._run_loop())
        except RuntimeError:
            self._sim_task = None

    def pause(self):
        if self.state != "running":
            return
        self.state = "paused"
        if self._sim_task:
            self._sim_task.cancel()
            self._sim_task = None
        self.log_event("simulation.paused", "Simulation engine paused.", "warning")

    def resume(self):
        if self.state != "paused":
            return
        self.start()

    def stop(self):
        self.state = "stopped"
        if self._sim_task:
            self._sim_task.cancel()
            self._sim_task = None
        self.log_event("simulation.stopped", "Simulation engine stopped.", "info")

    def reset(self):
        self.stop()
        self.sim_time_ms = 0.0
        self.in_transit_packets.clear()
        self.packets_history.clear()
        self.event_log.clear()
        self.metrics = SimulationMetrics()
        self.metric_snapshots.clear()
        self.recent_delivered_timestamps.clear()
        self.total_delivered_latency_ms = 0.0
        self.last_generation_sim_time = 0.0
        self._init_queues()
        # Reset router and link counters
        for r in self.topology.routers.values():
            r.total_processed = 0
            r.total_dropped = 0
            r.current_queue_len = 0
            r.status = "active"
        for l in self.topology.links.values():
            l.in_flight_count = 0
            l.utilization_pct = 0.0
            l.status = "active"
        self.log_event("simulation.reset", "Simulation state and metrics reset to zero.", "info")

    def step(self):
        """Single-step execution (advances exactly 1 tick = 50ms)."""
        if self.state == "running":
            self.pause()
        self.tick(self.tick_rate_ms)
        self.log_event("simulation.step", f"Stepped forward {self.tick_rate_ms}ms simulation time.", "info")

# Global singleton engine instance
engine = SimulationEngine()

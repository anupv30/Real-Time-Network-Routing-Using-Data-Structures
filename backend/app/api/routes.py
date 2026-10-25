import uuid
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.models.graph import NetworkTopology, RouterNode, NetworkLink
from app.models.packet import PacketPriority, PacketStatus
from app.algorithms.dijkstra import dijkstra_shortest_path, ShortestPathResult
from app.simulation.engine import engine
from app.simulation.topologies import BUILTIN_TOPOLOGIES
from app.persistence.database import (
    save_topology_to_db,
    get_topology_from_db,
    list_topologies_from_db,
    delete_topology_from_db,
    save_simulation_history,
    list_simulation_history
)

router = APIRouter(prefix="/api")

# Schemas
class PacketInjectionRequest(BaseModel):
    source: str
    destination: str
    priority: PacketPriority = PacketPriority.NORMAL
    payload_size: int = 1500

class PacketBurstRequest(BaseModel):
    source: str
    destination: str
    count: int = 10
    priority: PacketPriority = PacketPriority.NORMAL
    payload_size: int = 1500

class FailureRequest(BaseModel):
    id: str  # router_id or link_id

class RouterSchedulingPolicyRequest(BaseModel):
    id: str
    policy: str

class SimulationConfigRequest(BaseModel):
    speed_multiplier: Optional[float] = None
    auto_generate: Optional[bool] = None
    generation_rate_pps: Optional[float] = None
    gen_source: Optional[str] = None
    gen_destination: Optional[str] = None
    gen_priority: Optional[PacketPriority] = None

class DijkstraQueryRequest(BaseModel):
    source: str
    destination: str
    record_trace: bool = True

class SaveHistoryRequest(BaseModel):
    topology_name: Optional[str] = None
    notes: Optional[str] = None

# Health
@router.get("/health")
def get_health():
    return {
        "status": "healthy",
        "simulation_state": engine.state,
        "sim_time_ms": engine.sim_time_ms,
        "routers_count": len(engine.topology.routers),
        "links_count": len(engine.topology.links)
    }

# Topologies
@router.get("/topologies")
async def list_topologies():
    builtins = [
        {"id": "small", "name": "Small Network (5 Routers)", "description": "Canonical 5-node diamond network for learning Dijkstra.", "is_builtin": True},
        {"id": "mesh", "name": "Mesh Network (7 Routers)", "description": "Redundant mesh with multiple alternative paths.", "is_builtin": True},
        {"id": "lab", "name": "Congestion & Failure Lab (8 Routers)", "description": "Designed for testing bottlenecks and dynamic rerouting.", "is_builtin": True},
    ]
    saved = await list_topologies_from_db()
    for s in saved:
        s["is_builtin"] = False
    return {"topologies": builtins + saved}

@router.get("/topologies/{topology_id}")
async def get_topology(topology_id: str):
    if topology_id in BUILTIN_TOPOLOGIES:
        topo = BUILTIN_TOPOLOGIES[topology_id]()
        return topo
    saved = await get_topology_from_db(topology_id)
    if saved:
        return saved
    raise HTTPException(status_code=404, detail="Topology not found")

@router.post("/topologies")
async def save_custom_topology(topology: NetworkTopology):
    if not topology.id or topology.id in BUILTIN_TOPOLOGIES:
        topology.id = f"custom-{str(uuid.uuid4())[:8]}"
    success = await save_topology_to_db(topology)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save topology to database")
    return {"status": "saved", "id": topology.id}

@router.post("/topologies/{topology_id}/load")
async def load_topology_endpoint(topology_id: str):
    if topology_id in BUILTIN_TOPOLOGIES:
        topo = BUILTIN_TOPOLOGIES[topology_id]()
        engine.load_topology(topo)
        return {"status": "loaded", "topology": topo}
    saved = await get_topology_from_db(topology_id)
    if saved:
        engine.load_topology(saved)
        return {"status": "loaded", "topology": saved}
    raise HTTPException(status_code=404, detail="Topology not found")

@router.delete("/topologies/{topology_id}")
async def delete_topology_endpoint(topology_id: str):
    if topology_id in BUILTIN_TOPOLOGIES:
        raise HTTPException(status_code=400, detail="Cannot delete built-in topologies")
    success = await delete_topology_from_db(topology_id)
    if not success:
        raise HTTPException(status_code=404, detail="Topology not found or could not be deleted")
    return {"status": "deleted"}

# Simulation Controls
@router.post("/simulation/start")
async def start_simulation():
    engine.start()
    return {"status": "started", "state": engine.state}

@router.post("/simulation/pause")
async def pause_simulation():
    engine.pause()
    return {"status": "paused", "state": engine.state}

@router.post("/simulation/resume")
async def resume_simulation():
    engine.resume()
    return {"status": "resumed", "state": engine.state}

@router.post("/simulation/stop")
async def stop_simulation():
    engine.stop()
    return {"status": "stopped", "state": engine.state}

@router.post("/simulation/reset")
async def reset_simulation():
    engine.reset()
    return {"status": "reset", "state": engine.state}

@router.post("/simulation/step")
async def step_simulation():
    engine.step()
    return {"status": "stepped", "sim_time_ms": engine.sim_time_ms}

@router.get("/simulation/state")
def get_simulation_state():
    return engine.get_state_snapshot()

@router.get("/simulation/metrics")
def get_simulation_metrics():
    return {
        "metrics": engine.metrics.model_dump(),
        "snapshots": [s.model_dump() for s in engine.metric_snapshots]
    }

@router.post("/simulation/config")
def update_simulation_config(req: SimulationConfigRequest):
    if req.speed_multiplier is not None:
        engine.speed_multiplier = max(0.1, min(10.0, req.speed_multiplier))
    if req.auto_generate is not None:
        engine.auto_generate = req.auto_generate
    if req.generation_rate_pps is not None:
        engine.generation_rate_pps = max(0.1, min(50.0, req.generation_rate_pps))
    if req.gen_source is not None and req.gen_source in engine.topology.routers:
        engine.gen_source = req.gen_source
    if req.gen_destination is not None and req.gen_destination in engine.topology.routers:
        engine.gen_destination = req.gen_destination
    if req.gen_priority is not None:
        engine.gen_priority = req.gen_priority
    return {"status": "updated", "config": {
        "speed_multiplier": engine.speed_multiplier,
        "auto_generate": engine.auto_generate,
        "generation_rate_pps": engine.generation_rate_pps,
        "gen_source": engine.gen_source,
        "gen_destination": engine.gen_destination,
        "gen_priority": engine.gen_priority
    }}

@router.post("/simulation/router/policy")
def set_router_scheduling_policy(req: RouterSchedulingPolicyRequest):
    router = engine.topology.routers.get(req.id)
    if not router:
        raise HTTPException(status_code=404, detail="Router not found")
    if req.policy not in {"fifo", "priority"}:
        raise HTTPException(status_code=400, detail="Policy must be 'fifo' or 'priority'")

    queue = engine.queues[req.id]
    if queue.size() or queue.is_processing:
        raise HTTPException(
            status_code=409,
            detail="Cannot change scheduling policy while the router has packets queued or processing",
        )

    router.scheduling_policy = req.policy
    queue.scheduling_policy = req.policy
    engine.log_event(
        "router.policy_changed",
        f"Router {req.id} scheduling policy changed to {req.policy.upper()}.",
        "info",
        router_id=req.id,
    )
    return {"status": "updated", "router_id": req.id, "policy": req.policy}

# Packet Injection
@router.post("/simulation/packet")
def inject_packet(req: PacketInjectionRequest):
    pkt = engine.create_packet(
        source=req.source,
        destination=req.destination,
        priority=req.priority,
        payload_size=req.payload_size
    )
    if not pkt:
        raise HTTPException(status_code=400, detail="Failed to create packet. Check source and destination routers.")
    return {"status": "injected", "packet": pkt}

@router.post("/simulation/packet/burst")
def inject_packet_burst(req: PacketBurstRequest):
    if req.source not in engine.topology.routers or req.destination not in engine.topology.routers:
        raise HTTPException(status_code=400, detail="Invalid source or destination router.")

    injected = []
    dropped = 0
    count = max(1, min(100, req.count))
    for _ in range(count):
        pkt = engine.create_packet(
            source=req.source,
            destination=req.destination,
            priority=req.priority,
            payload_size=req.payload_size
        )
        if pkt:
            if pkt.status == PacketStatus.DROPPED:
                dropped += 1
            else:
                injected.append(pkt)
    return {
        "status": "burst_completed",
        "total_requested": count,
        "enqueued": len(injected),
        "dropped": dropped
    }

# Packet Journey & History
@router.get("/packets/recent")
def get_recent_packets(
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = None,
    priority: Optional[str] = None
):
    packets = list(engine.packets_history.values())
    if status:
        stat_lower = status.lower()
        packets = [p for p in packets if p.status.value.lower() == stat_lower or p.status == stat_lower]
    if priority:
        prio_lower = priority.lower()
        packets = [p for p in packets if p.priority.value.lower() == prio_lower or p.priority == prio_lower]

    packets = packets[-limit:]
    packets.reverse()

    return {
        "total_retained": len(engine.packets_history),
        "packets": [
            {
                "id": p.id,
                "source": p.source,
                "destination": p.destination,
                "priority": p.priority.value,
                "status": p.status.value,
                "hop_count": p.hop_count,
                "accumulated_latency_ms": round(p.accumulated_latency_ms, 1),
                "created_at_sim_time": p.created_at_sim_time,
                "delivered_at_sim_time": p.delivered_at_sim_time,
                "drop_reason": p.drop_reason.value if p.drop_reason else None,
                "current_router": p.current_router,
                "current_link_id": p.current_link_id,
                "next_router": p.next_router,
                "route": p.route,
                "traversed_route": p.traversed_route,
                "events_count": len(p.journey_events)
            }
            for p in packets
        ]
    }

@router.get("/packets/{packet_id}/journey")
def get_packet_journey(packet_id: str):
    pkt = engine.packets_history.get(packet_id)
    if not pkt:
        raise HTTPException(
            status_code=404,
            detail=f"Packet '{packet_id}' not found or no longer retained in simulation history."
        )

    total_latency = None
    if pkt.delivered_at_sim_time is not None:
        total_latency = round(pkt.delivered_at_sim_time - pkt.created_at_sim_time, 1)
    elif pkt.status == PacketStatus.DROPPED:
        total_latency = round(pkt.accumulated_latency_ms, 1)

    return {
        "packet_id": pkt.id,
        "source": pkt.source,
        "destination": pkt.destination,
        "priority": pkt.priority.value,
        "payload_size_bytes": pkt.payload_size_bytes,
        "status": pkt.status.value,
        "drop_reason": pkt.drop_reason.value if pkt.drop_reason else None,
        "current_router": pkt.current_router,
        "next_router": pkt.next_router,
        "current_link_id": pkt.current_link_id,
        "planned_route": pkt.route,
        "traversed_route": pkt.traversed_route,
        "hop_count": pkt.hop_count,
        "created_at_sim_time": pkt.created_at_sim_time,
        "delivered_at_sim_time": pkt.delivered_at_sim_time,
        "total_latency_ms": total_latency,
        "accumulated_latency_ms": round(pkt.accumulated_latency_ms, 1),
        "reroute_count": pkt.reroute_count,
        "transit_progress": round(pkt.transit_progress, 3) if pkt.status == PacketStatus.IN_TRANSIT else None,
        "events": [
            {
                "sequence_num": ev.sequence_num,
                "timestamp_sim_ms": ev.timestamp_sim_ms,
                "sim_time_ms": ev.timestamp_sim_ms,
                "event_type": ev.event_type,
                "stage": ev.stage,
                "router_id": ev.router_id,
                "link_id": ev.link_id,
                "message": ev.message,
                "details": ev.details
            }
            for ev in pkt.journey_events
        ]
    }

@router.get("/packets/{packet_id}")
def get_packet_details(packet_id: str):
    pkt = engine.packets_history.get(packet_id)
    if not pkt:
        raise HTTPException(
            status_code=404,
            detail=f"Packet '{packet_id}' not found or no longer retained in simulation history."
        )
    return pkt

# Failures & Congestion
@router.post("/simulation/failure/router")
def toggle_router_failure(req: FailureRequest):
    router = engine.topology.routers.get(req.id)
    if not router:
        raise HTTPException(status_code=404, detail="Router not found")
    if router.status == "failed":
        engine.restore_router(req.id)
        action = "restored"
    else:
        engine.fail_router(req.id)
        action = "failed"
    return {"status": action, "router_id": req.id, "current_status": router.status}

@router.post("/simulation/failure/link")
def toggle_link_failure(req: FailureRequest):
    link = engine.topology.links.get(req.id)
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    if link.status == "failed":
        engine.restore_link(req.id)
        action = "restored"
    else:
        engine.fail_link(req.id)
        action = "failed"
    return {"status": action, "link_id": req.id, "current_status": link.status}

@router.post("/simulation/congestion/router")
def toggle_router_congestion(req: FailureRequest):
    if req.id not in engine.topology.routers:
        raise HTTPException(status_code=404, detail="Router not found")
    engine.congest_router(req.id)
    router = engine.topology.routers[req.id]
    return {"status": router.status, "router_id": req.id, "processing_delay_ms": router.processing_delay_ms}

@router.post("/simulation/congestion/link")
def toggle_link_congestion(req: FailureRequest):
    if req.id not in engine.topology.links:
        raise HTTPException(status_code=404, detail="Link not found")
    engine.congest_link(req.id)
    link = engine.topology.links[req.id]
    return {"status": link.status, "link_id": req.id, "latency_ms": link.latency_ms, "cost": link.cost}

# Routing / Dijkstra
@router.post("/routing/dijkstra", response_model=ShortestPathResult)
def run_dijkstra_calculation(req: DijkstraQueryRequest):
    result = dijkstra_shortest_path(
        topology=engine.topology,
        source=req.source,
        destination=req.destination,
        record_trace=req.record_trace
    )
    return result

# History
@router.get("/history")
async def get_history():
    records = await list_simulation_history()
    return {"history": records}

@router.post("/history/save")
async def save_history_record(req: SaveHistoryRequest):
    record_id = f"sim-{str(uuid.uuid4())[:8]}"
    record = {
        "id": record_id,
        "topology_name": req.topology_name or engine.topology.name,
        "packets_generated": engine.metrics.total_generated,
        "packets_delivered": engine.metrics.total_delivered,
        "packets_dropped": engine.metrics.total_dropped,
        "avg_latency_ms": engine.metrics.avg_latency_ms or 0.0,
        "throughput_pps": engine.metrics.throughput_pps,
        "duration_sec": engine.metrics.elapsed_sim_time_sec
    }
    success = await save_simulation_history(record)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save simulation history")
    return {"status": "saved", "record": record}

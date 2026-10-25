import asyncio
import pytest
from app.simulation.engine import SimulationEngine
from app.simulation.topologies import create_small_network
from app.models.packet import PacketPriority, PacketStatus, DropReason

def test_engine_packet_injection():
    engine = SimulationEngine(create_small_network())
    pkt = engine.create_packet("R1", "R5", priority=PacketPriority.HIGH)
    assert pkt is not None
    assert pkt.source == "R1"
    assert pkt.destination == "R5"
    assert pkt.status == PacketStatus.QUEUED
    assert engine.metrics.total_generated == 1
    assert engine.queues["R1"].size() == 1

def test_engine_generates_packets_by_default():
    engine = SimulationEngine(create_small_network())
    assert engine.auto_generate is True

    engine.tick(500.0)

    assert engine.metrics.total_generated == 1
    assert len(engine.packets_history) == 1

def test_topology_load_resets_packet_generation_clock():
    engine = SimulationEngine(create_small_network())
    engine.tick(1000.0)
    assert engine.last_generation_sim_time == 1000.0

    engine.load_topology(create_small_network())
    engine.tick(500.0)

    assert engine.metrics.total_generated == 1

def test_reset_resets_packet_generation_clock():
    engine = SimulationEngine(create_small_network())
    engine.tick(1000.0)

    engine.reset()
    engine.tick(500.0)

    assert engine.metrics.total_generated == 1

def test_engine_bounds_packet_history():
    engine = SimulationEngine(create_small_network())

    for _ in range(501):
        engine.create_packet("R1", "R5")

    assert len(engine.packets_history) == 500
    assert engine.metrics.total_generated == 501

def test_simulation_loop_pauses_and_logs_tick_errors(monkeypatch):
    engine = SimulationEngine(create_small_network())
    engine.state = "running"

    def fail_tick(_delta):
        raise RuntimeError("simulated tick failure")

    monkeypatch.setattr(engine, "tick", fail_tick)
    asyncio.run(engine._run_loop())

    assert engine.state == "paused"
    assert engine.event_log[-1].event_type == "simulation.error"

def test_engine_packet_delivery():
    engine = SimulationEngine(create_small_network())
    engine.auto_generate = False
    # R1 to R5 path: R1 -> R3 -> R2 -> R4 -> R5
    pkt = engine.create_packet("R1", "R5")
    assert pkt.id in engine.packets_history

    # Advance simulation by several ticks to process and transit through all hops
    # Each hop has router delay (20ms) + link latency (10-50ms)
    # Total trip ~200ms sim time
    for _ in range(50):
        engine.tick(20.0)

    delivered_pkt = engine.packets_history[pkt.id]
    assert delivered_pkt.status == PacketStatus.DELIVERED
    assert delivered_pkt.hop_count == 4
    assert engine.metrics.total_delivered == 1
    assert engine.metrics.delivery_ratio == 100.0
    assert engine.metrics.avg_latency_ms is not None
    assert engine.metrics.min_latency_ms is not None
    assert engine.metrics.max_latency_ms is not None

def test_engine_router_failure_and_reroute():
    engine = SimulationEngine(create_small_network())
    # Fail router R2 which is on the primary shortest path
    engine.fail_router("R2")
    assert engine.topology.routers["R2"].status == "failed"

    # Injected packet should compute alternative route avoiding R2: R1 -> R3 -> R4 -> R5
    pkt = engine.create_packet("R1", "R5")
    assert pkt is not None
    assert "R2" not in pkt.route
    assert pkt.route == ["R1", "R3", "R4", "R5"]

def test_engine_link_failure():
    engine = SimulationEngine(create_small_network())
    engine.fail_link("L_R1_R3")
    assert engine.topology.links["L_R1_R3"].status == "failed"

    pkt = engine.create_packet("R1", "R5")
    assert pkt is not None
    # Must use L_R1_R2: R1 -> R2 -> R4 -> R5
    assert pkt.route[0] == "R1"
    assert pkt.route[1] == "R2"

def test_engine_reset():
    engine = SimulationEngine(create_small_network())
    engine.create_packet("R1", "R5")
    assert engine.metrics.total_generated == 1
    
    engine.reset()
    assert engine.metrics.total_generated == 0
    assert engine.metrics.total_delivered == 0
    assert engine.sim_time_ms == 0.0
    assert engine.queues["R1"].size() == 0
    assert engine.total_delivered_latency_ms == 0.0

def test_snapshot_queued_packets_fifo():
    engine = SimulationEngine(create_small_network())
    engine.auto_generate = False
    p_low = engine.create_packet("R1", "R5", priority=PacketPriority.LOW)
    p_norm = engine.create_packet("R1", "R5", priority=PacketPriority.NORMAL)
    p_high = engine.create_packet("R1", "R5", priority=PacketPriority.HIGH)
    p_crit = engine.create_packet("R1", "R5", priority=PacketPriority.CRITICAL)

    snap = engine.get_state_snapshot()
    r1_queued = snap["routers"]["R1"]["queued_packets"]
    assert len(r1_queued) == 4
    # In FIFO: arrival order Low -> Normal -> High -> Critical
    assert [p["priority"] for p in r1_queued] == ["low", "normal", "high", "critical"]
    assert [p["id"] for p in r1_queued] == [p_low.id, p_norm.id, p_high.id, p_crit.id]

def test_snapshot_queued_packets_priority():
    engine = SimulationEngine(create_small_network())
    engine.auto_generate = False
    engine.topology.routers["R1"].scheduling_policy = "priority"
    engine.queues["R1"].scheduling_policy = "priority"

    p_low = engine.create_packet("R1", "R5", priority=PacketPriority.LOW)
    p_norm = engine.create_packet("R1", "R5", priority=PacketPriority.NORMAL)
    p_high = engine.create_packet("R1", "R5", priority=PacketPriority.HIGH)
    p_crit = engine.create_packet("R1", "R5", priority=PacketPriority.CRITICAL)

    snap = engine.get_state_snapshot()
    r1_queued = snap["routers"]["R1"]["queued_packets"]
    assert len(r1_queued) == 4
    # In Priority: Critical -> High -> Normal -> Low
    assert [p["priority"] for p in r1_queued] == ["critical", "high", "normal", "low"]
    assert [p["id"] for p in r1_queued] == [p_crit.id, p_high.id, p_norm.id, p_low.id]

def test_snapshot_processing_packet_separate_from_queue():
    engine = SimulationEngine(create_small_network())
    engine.auto_generate = False
    p1 = engine.create_packet("R1", "R5", priority=PacketPriority.NORMAL)
    p2 = engine.create_packet("R1", "R5", priority=PacketPriority.HIGH)

    # Before tick, both in queue
    snap = engine.get_state_snapshot()
    assert len(snap["routers"]["R1"]["queued_packets"]) == 2
    assert snap["routers"]["R1"]["processing_packet"] is None
    assert snap["routers"]["R1"]["is_processing"] is False

    # Tick 50ms - packet 1 is dequeued and starts processing at R1
    engine.tick(50.0)
    snap = engine.get_state_snapshot()
    r1 = snap["routers"]["R1"]
    assert r1["is_processing"] is True
    assert r1["processing_packet"] is not None
    assert r1["processing_packet"]["id"] == p1.id
    # Only packet 2 remains in the queue!
    assert len(r1["queued_packets"]) == 1
    assert r1["queued_packets"][0]["id"] == p2.id
    assert r1["queue_len"] == 1

def test_burst_injection_and_tail_drop_sync():
    engine = SimulationEngine(create_small_network())
    engine.auto_generate = False
    # Set R1 capacity to 10
    engine.topology.routers["R1"].queue_capacity = 10
    engine.queues["R1"].capacity = 10

    # Inject 30 packets while stopped
    for _ in range(30):
        engine.create_packet("R1", "R5", priority=PacketPriority.NORMAL)

    snap = engine.get_state_snapshot()
    r1 = snap["routers"]["R1"]
    assert r1["queue_len"] == 10
    assert len(r1["queued_packets"]) == 10
    assert r1["queue_utilization_pct"] == 100.0
    assert r1["total_dropped"] == 20
    assert snap["metrics"]["total_dropped"] == 20
    assert snap["metrics"]["total_generated"] == 30

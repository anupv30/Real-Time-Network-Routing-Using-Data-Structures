import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.simulation.engine import engine
from app.models.packet import PacketPriority, PacketStatus, DropReason
from app.simulation.topologies import BUILTIN_TOPOLOGIES

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_engine():
    engine.load_topology(BUILTIN_TOPOLOGIES["small"]())
    engine.reset()
    yield
    engine.stop()

def test_packet_creation_and_journey_events():
    pkt = engine.create_packet("R1", "R5", PacketPriority.HIGH)
    assert pkt is not None
    assert pkt.id in engine.packets_history
    assert len(pkt.journey_events) >= 2  # GENERATED and QUEUED
    
    gen_event = pkt.journey_events[0]
    assert gen_event.stage == "GENERATED"
    assert gen_event.router_id == "R1"
    assert gen_event.sequence_num == 1
    assert "R5" in gen_event.message

    queue_event = pkt.journey_events[1]
    assert queue_event.stage == "QUEUED"
    assert queue_event.router_id == "R1"
    assert queue_event.sequence_num == 2

def test_packet_lifecycle_to_delivery():
    # Inject packet from R1 to R5 and advance simulation until delivery
    pkt = engine.create_packet("R1", "R5", PacketPriority.NORMAL)
    assert pkt is not None
    pkt_id = pkt.id

    # Step simulation until delivered or 100 ticks max
    for _ in range(80):
        engine.tick(50.0)
        if pkt.status == PacketStatus.DELIVERED:
            break

    assert pkt.status == PacketStatus.DELIVERED
    assert pkt.delivered_at_sim_time is not None
    assert pkt.hop_count == 4
    assert pkt.traversed_route == ["R1", "R3", "R2", "R4", "R5"]

    stages = [ev.stage for ev in pkt.journey_events]
    assert "GENERATED" in stages
    assert "QUEUED" in stages
    assert "PROCESSING" in stages
    assert "PROCESSING_COMPLETED" in stages
    assert "FORWARDED" in stages
    assert "ARRIVED" in stages
    assert "DELIVERED" in stages

    # Check sequence numbers strictly monotonic
    seqs = [ev.sequence_num for ev in pkt.journey_events]
    assert seqs == sorted(seqs)
    assert len(seqs) == len(set(seqs))

def test_packet_journey_api_endpoints():
    pkt = engine.create_packet("R1", "R5", PacketPriority.CRITICAL)
    assert pkt is not None

    # Test GET /api/packets/recent
    res = client.get("/api/packets/recent")
    assert res.status_code == 200
    data = res.json()
    assert "packets" in data
    assert any(p["id"] == pkt.id for p in data["packets"])
    p_info = next(p for p in data["packets"] if p["id"] == pkt.id)
    assert p_info["priority"] == "critical"
    assert p_info["source"] == "R1"
    assert p_info["destination"] == "R5"

    # Test GET /api/packets/{packet_id}/journey
    res_journey = client.get(f"/api/packets/{pkt.id}/journey")
    assert res_journey.status_code == 200
    j_data = res_journey.json()
    assert j_data["packet_id"] == pkt.id
    assert j_data["priority"] == "critical"
    assert "events" in j_data
    assert len(j_data["events"]) >= 2
    assert j_data["planned_route"] == ["R1", "R3", "R2", "R4", "R5"]

    # Test GET /api/packets/{packet_id}
    res_details = client.get(f"/api/packets/{pkt.id}")
    assert res_details.status_code == 200
    assert res_details.json()["id"] == pkt.id

def test_packet_journey_tail_drop():
    # Fill queue of R1 to capacity (10)
    q = engine.queues["R1"]
    for _ in range(q.capacity):
        engine.create_packet("R1", "R5", PacketPriority.LOW)
    
    # 11th packet must tail drop
    overflow_pkt = engine.create_packet("R1", "R5", PacketPriority.LOW)
    assert overflow_pkt.status == PacketStatus.DROPPED
    assert overflow_pkt.drop_reason == DropReason.QUEUE_OVERFLOW

    stages = [ev.stage for ev in overflow_pkt.journey_events]
    assert "GENERATED" in stages
    assert "DROPPED" in stages
    drop_ev = next(ev for ev in overflow_pkt.journey_events if ev.stage == "DROPPED")
    assert "Tail drop" in drop_ev.message or "capacity" in drop_ev.message

def test_packet_journey_router_failure():
    pkt = engine.create_packet("R1", "R5", PacketPriority.NORMAL)
    assert pkt.status == PacketStatus.QUEUED

    # Fail router R1 while packet is in queue
    engine.fail_router("R1")
    assert pkt.status == PacketStatus.DROPPED
    assert pkt.drop_reason == DropReason.ROUTER_FAILED

    stages = [ev.stage for ev in pkt.journey_events]
    assert "DROPPED" in stages
    drop_ev = next(ev for ev in pkt.journey_events if ev.stage == "DROPPED")
    assert "failed" in drop_ev.message

def test_packet_journey_link_failure():
    # Create packet at R1 destined to R5
    pkt = engine.create_packet("R1", "R5", PacketPriority.NORMAL)
    # Tick to dequeue and start processing
    engine.tick(5.0)
    # Tick to finish processing (20ms) and dispatch onto link
    engine.tick(25.0)
    
    assert len(engine.in_transit_packets) > 0
    in_transit_item = engine.in_transit_packets[0]
    pkt = in_transit_item.packet
    link_id = in_transit_item.link_id

    # Fail this link
    engine.fail_link(link_id)
    assert pkt.status == PacketStatus.DROPPED
    assert pkt.drop_reason == DropReason.LINK_FAILED

    stages = [ev.stage for ev in pkt.journey_events]
    assert "FORWARDED" in stages
    assert "DROPPED" in stages

def test_packet_journey_unknown_404():
    res = client.get("/api/packets/PKT-NONEXISTENT/journey")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()

def test_packet_journey_reset_clears_history():
    pkt = engine.create_packet("R1", "R5")
    assert pkt.id in engine.packets_history
    engine.reset()
    assert len(engine.packets_history) == 0
    res = client.get(f"/api/packets/{pkt.id}/journey")
    assert res.status_code == 404

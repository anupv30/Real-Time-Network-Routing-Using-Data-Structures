import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.simulation.engine import engine
from app.simulation.topologies import create_small_network
from app.models.packet import PacketPriority

client = TestClient(app)

def setup_clean_simulation():
    client.post("/api/topologies/small/load")
    client.post("/api/simulation/reset")
    # Stop and disable auto generator
    client.post("/api/simulation/config", json={"auto_generate": False})

def test_1_empty_queue():
    setup_clean_simulation()
    state = client.get("/api/simulation/state").json()
    r1 = state["routers"]["R1"]
    assert r1["queue_len"] == 0
    assert r1["queued_packets"] == []
    assert r1["is_processing"] is False
    assert r1["processing_packet"] is None
    assert r1["queue_utilization_pct"] == 0.0

def test_2_partial_queue():
    setup_clean_simulation()
    # Inject 5 packets into R1 (capacity is 10)
    for i in range(5):
        res = client.post("/api/simulation/packet", json={
            "source": "R1",
            "destination": "R5",
            "priority": "normal"
        })
        assert res.status_code == 200

    state = client.get("/api/simulation/state").json()
    r1 = state["routers"]["R1"]
    assert r1["queue_len"] == 5
    assert len(r1["queued_packets"]) == 5
    assert r1["queue_capacity"] == 10
    assert r1["queue_utilization_pct"] == 50.0
    assert r1["total_dropped"] == 0

def test_3_full_queue():
    setup_clean_simulation()
    # Inject 10 packets into R1 (capacity 10)
    for _ in range(10):
        client.post("/api/simulation/packet", json={
            "source": "R1",
            "destination": "R5",
            "priority": "normal"
        })

    state = client.get("/api/simulation/state").json()
    r1 = state["routers"]["R1"]
    assert r1["queue_len"] == 10
    assert len(r1["queued_packets"]) == 10
    assert r1["queue_utilization_pct"] == 100.0
    assert r1["total_dropped"] == 0

def test_4_queue_overflow():
    setup_clean_simulation()
    # Inject 30 packets via burst endpoint
    res = client.post("/api/simulation/packet/burst", json={
        "source": "R1",
        "destination": "R5",
        "count": 30,
        "priority": "normal"
    })
    assert res.status_code == 200
    burst_data = res.json()
    assert burst_data["enqueued"] == 10
    assert burst_data["dropped"] == 20

    state = client.get("/api/simulation/state").json()
    r1 = state["routers"]["R1"]
    assert r1["queue_len"] == 10
    assert len(r1["queued_packets"]) == 10
    assert r1["queue_utilization_pct"] == 100.0
    assert r1["total_dropped"] == 20
    assert state["metrics"]["total_dropped"] == 20

def test_5_queue_draining():
    setup_clean_simulation()
    # Inject 10 packets
    for _ in range(10):
        client.post("/api/simulation/packet", json={
            "source": "R1",
            "destination": "R5",
            "priority": "normal"
        })

    state_before = client.get("/api/simulation/state").json()
    assert state_before["routers"]["R1"]["queue_len"] == 10

    # Step simulation forward 1 tick (50ms)
    client.post("/api/simulation/step")
    state_after = client.get("/api/simulation/state").json()
    r1 = state_after["routers"]["R1"]
    # 1 packet has been dequeued and is now processing
    assert r1["queue_len"] == 9
    assert len(r1["queued_packets"]) == 9
    assert r1["is_processing"] is True
    assert r1["processing_packet"] is not None

def test_6_fifo_order():
    setup_clean_simulation()
    # Inject in order: Low, Normal, High, Critical
    priorities = ["low", "normal", "high", "critical"]
    for p in priorities:
        client.post("/api/simulation/packet", json={
            "source": "R1",
            "destination": "R5",
            "priority": p
        })

    state = client.get("/api/simulation/state").json()
    r1 = state["routers"]["R1"]
    assert r1["scheduling_policy"] == "fifo"
    queued = r1["queued_packets"]
    assert len(queued) == 4
    # Exact arrival order preserved in FIFO
    assert [p["priority"] for p in queued] == ["low", "normal", "high", "critical"]

def test_7_priority_order():
    setup_clean_simulation()
    # Switch R1 to priority
    res = client.post("/api/simulation/router/policy", json={"id": "R1", "policy": "priority"})
    assert res.status_code == 200

    # Inject in order: Low, Normal, High, Critical
    priorities = ["low", "normal", "high", "critical"]
    for p in priorities:
        client.post("/api/simulation/packet", json={
            "source": "R1",
            "destination": "R5",
            "priority": p
        })

    state = client.get("/api/simulation/state").json()
    r1 = state["routers"]["R1"]
    assert r1["scheduling_policy"] == "priority"
    queued = r1["queued_packets"]
    assert len(queued) == 4
    # Logical dequeue order: Critical -> High -> Normal -> Low
    assert [p["priority"] for p in queued] == ["critical", "high", "normal", "low"]

def test_8_router_switching():
    setup_clean_simulation()
    # Inject into R1
    client.post("/api/simulation/packet", json={"source": "R1", "destination": "R5", "priority": "high"})
    # Inject into R2
    client.post("/api/simulation/packet", json={"source": "R2", "destination": "R5", "priority": "critical"})

    state = client.get("/api/simulation/state").json()
    r1_queue = state["routers"]["R1"]["queued_packets"]
    r2_queue = state["routers"]["R2"]["queued_packets"]
    r3_queue = state["routers"]["R3"]["queued_packets"]

    assert len(r1_queue) == 1
    assert r1_queue[0]["priority"] == "high"
    assert len(r2_queue) == 1
    assert r2_queue[0]["priority"] == "critical"
    assert len(r3_queue) == 0

def test_9_regression():
    setup_clean_simulation()
    # 1. Dijkstra check
    dijkstra_res = client.post("/api/routing/dijkstra", json={
        "source": "R1",
        "destination": "R5",
        "record_trace": True
    })
    assert dijkstra_res.status_code == 200
    assert dijkstra_res.json()["is_reachable"] is True

    # 2. Router failure & clear
    client.post("/api/simulation/packet", json={"source": "R1", "destination": "R5", "priority": "normal"})
    fail_res = client.post("/api/simulation/failure/router", json={"id": "R1"})
    assert fail_res.status_code == 200
    state = client.get("/api/simulation/state").json()
    assert state["routers"]["R1"]["status"] == "failed"
    assert state["routers"]["R1"]["queue_len"] == 0
    assert state["routers"]["R1"]["is_processing"] is False

    # Restore
    client.post("/api/simulation/failure/router", json={"id": "R1"})

    # 3. Congestion toggle
    cong_res = client.post("/api/simulation/congestion/router", json={"id": "R1"})
    assert cong_res.status_code == 200
    state = client.get("/api/simulation/state").json()
    assert state["routers"]["R1"]["status"] == "congested"

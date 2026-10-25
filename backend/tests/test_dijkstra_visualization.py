import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def setup_small_network():
    client.post("/api/topologies/small/load")
    client.post("/api/simulation/reset")

def test_1_default_topology_shortest_path():
    setup_small_network()
    # Test 1: Default Topology: R1 -> R5
    res = client.post("/api/routing/dijkstra", json={
        "source": "R1",
        "destination": "R5",
        "record_trace": False
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_reachable"] is True
    # Expected route: R1 -> R3 -> R2 -> R4 -> R5
    assert data["path"] == ["R1", "R3", "R2", "R4", "R5"]
    # Expected cost: 2 + 1 + 5 + 2 = 10
    assert data["total_cost"] == 10.0
    assert data["hops"] == 4
    # Expected links used: L_R1_R3, L_R2_R3, L_R2_R4, L_R4_R5
    assert "L_R1_R3" in data["links_used"]
    assert "L_R2_R3" in data["links_used"]
    assert "L_R2_R4" in data["links_used"]
    assert "L_R4_R5" in data["links_used"]

def test_2_router_failure():
    setup_small_network()
    # Fail R2
    fail_res = client.post("/api/simulation/failure/router", json={"id": "R2"})
    assert fail_res.status_code == 200
    assert fail_res.json()["current_status"] == "failed"

    # Test 2: R1 -> R5 with R2 failed
    res = client.post("/api/routing/dijkstra", json={
        "source": "R1",
        "destination": "R5",
        "record_trace": False
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_reachable"] is True
    # Expected route avoiding R2: R1 -> R3 -> R4 -> R5
    assert data["path"] == ["R1", "R3", "R4", "R5"]
    # Expected cost: 2 + 8 + 2 = 12
    assert data["total_cost"] == 12.0
    assert data["hops"] == 3

def test_3_router_restoration():
    setup_small_network()
    # Fail R2 first
    client.post("/api/simulation/failure/router", json={"id": "R2"})
    # Restore R2
    restore_res = client.post("/api/simulation/failure/router", json={"id": "R2"})
    assert restore_res.status_code == 200
    assert restore_res.json()["current_status"] == "active"

    # Test 3: R1 -> R5 restored
    res = client.post("/api/routing/dijkstra", json={
        "source": "R1",
        "destination": "R5",
        "record_trace": False
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_reachable"] is True
    assert data["path"] == ["R1", "R3", "R2", "R4", "R5"]
    assert data["total_cost"] == 10.0

def test_4_link_weight_update_and_congestion():
    setup_small_network()
    # Initial state: L_R2_R3 has cost 1.0, latency 10ms
    # Path is R1 -> R3 -> R2 -> R4 -> R5 (cost 10)
    # Congest link L_R2_R3 (4x latency and cost multiplier)
    cong_res = client.post("/api/simulation/congestion/link", json={"id": "L_R2_R3"})
    assert cong_res.status_code == 200
    state = client.get("/api/simulation/state").json()
    link_r2_r3 = state["links"]["L_R2_R3"]
    assert link_r2_r3["status"] == "congested"
    # Cost should have increased from 1.0 to 4.0
    assert link_r2_r3["cost"] == 4.0

    # With L_R2_R3 congested (cost 4.0):
    # Path 1: R1 -> R3 (2) + R2 (4) + R4 (5) + R5 (2) = 13.0
    # Path 2: R1 -> R2 (4) + R4 (5) + R5 (2) = 11.0
    # Path 3: R1 -> R3 (2) + R4 (8) + R5 (2) = 12.0
    # Optimal route becomes Path 2: R1 -> R2 -> R4 -> R5 with cost 11.0
    res = client.post("/api/routing/dijkstra", json={
        "source": "R1",
        "destination": "R5",
        "record_trace": False
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_reachable"] is True
    assert data["path"] == ["R1", "R2", "R4", "R5"]
    assert data["total_cost"] == 11.0

def test_5_unreachable_destination():
    setup_small_network()
    # Disconnect destination R5 completely by failing all ingress links to R5: L_R4_R5 and L_R2_R5
    client.post("/api/simulation/failure/link", json={"id": "L_R4_R5"})
    client.post("/api/simulation/failure/link", json={"id": "L_R2_R5"})

    res = client.post("/api/routing/dijkstra", json={
        "source": "R1",
        "destination": "R5",
        "record_trace": False
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_reachable"] is False
    assert data["path"] == []
    assert data["total_cost"] is None or data["total_cost"] == float("inf")

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "simulation_state" in data

def test_api_topologies_list():
    response = client.get("/api/topologies")
    assert response.status_code == 200
    topos = response.json()["topologies"]
    ids = [t["id"] for t in topos]
    assert "small" in ids
    assert "mesh" in ids
    assert "lab" in ids

def test_api_load_topology():
    response = client.post("/api/topologies/small/load")
    assert response.status_code == 200
    assert response.json()["status"] == "loaded"

def test_api_simulation_controls():
    # Start
    res_start = client.post("/api/simulation/start")
    assert res_start.status_code == 200
    assert res_start.json()["state"] == "running"

    # Pause
    res_pause = client.post("/api/simulation/pause")
    assert res_pause.status_code == 200
    assert res_pause.json()["state"] == "paused"

    # Step
    res_step = client.post("/api/simulation/step")
    assert res_step.status_code == 200

    # Reset
    res_reset = client.post("/api/simulation/reset")
    assert res_reset.status_code == 200
    assert res_reset.json()["state"] == "stopped"

def test_api_routing_dijkstra():
    payload = {
        "source": "R1",
        "destination": "R5",
        "record_trace": True
    }
    response = client.post("/api/routing/dijkstra", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_reachable"] is True
    assert data["path"] == ["R1", "R3", "R2", "R4", "R5"]
    assert len(data["trace"]) > 0

def test_api_packet_injection():
    payload = {
        "source": "R1",
        "destination": "R5",
        "priority": "critical",
        "payload_size": 1500
    }
    response = client.post("/api/simulation/packet", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "injected"
    assert data["packet"]["priority"] == "critical"

def test_api_router_scheduling_policy():
    client.post("/api/topologies/small/load")

    response = client.post(
        "/api/simulation/router/policy",
        json={"id": "R1", "policy": "priority"},
    )

    assert response.status_code == 200
    assert response.json()["policy"] == "priority"
    state = client.get("/api/simulation/state").json()
    assert state["routers"]["R1"]["scheduling_policy"] == "priority"

    client.post("/api/topologies/small/load")

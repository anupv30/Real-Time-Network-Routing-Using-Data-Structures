import pytest
from app.algorithms.dijkstra import dijkstra_shortest_path
from app.simulation.topologies import create_small_network, create_mesh_network, create_lab_network

def test_dijkstra_small_network():
    topo = create_small_network()
    # In small network:
    # R1 -> R3 (cost 2) -> R2 (cost 1) -> R4 (cost 5) -> R5 (cost 2) => total 10
    # or R1 -> R3 (cost 2) -> R4 (cost 8) -> R5 (cost 2) => total 12
    # or R1 -> R2 (cost 4) -> R4 (cost 5) -> R5 (cost 2) => total 11
    # or R1 -> R3 (2) -> R2 (1) -> R5 (10) => 13
    # Shortest path from R1 to R5: R1 -> R3 (2) -> R2 (1) -> R4 (5) -> R5 (2) = cost 10
    res = dijkstra_shortest_path(topo, "R1", "R5", record_trace=True)
    assert res.is_reachable is True
    assert res.path == ["R1", "R3", "R2", "R4", "R5"]
    assert res.total_cost == 10.0
    assert len(res.trace) > 0

def test_dijkstra_source_equals_dest():
    topo = create_small_network()
    res = dijkstra_shortest_path(topo, "R1", "R1", record_trace=False)
    assert res.is_reachable is True
    assert res.path == ["R1"]
    assert res.total_cost == 0.0

def test_dijkstra_failed_link_reroute():
    topo = create_small_network()
    # Fail link R2-R3 (cost 1.0)
    topo.links["L_R2_R3"].status = "failed"
    res = dijkstra_shortest_path(topo, "R1", "R5", record_trace=False)
    assert res.is_reachable is True
    # Now path should be R1 -> R2 (4) -> R4 (5) -> R5 (2) = cost 11
    assert res.path == ["R1", "R2", "R4", "R5"]
    assert res.total_cost == 11.0

def test_dijkstra_failed_router():
    topo = create_small_network()
    # Fail router R2
    topo.routers["R2"].status = "failed"
    res = dijkstra_shortest_path(topo, "R1", "R5", record_trace=False)
    assert res.is_reachable is True
    # Path must avoid R2: R1 -> R3 (2) -> R4 (8) -> R5 (2) = 12
    assert res.path == ["R1", "R3", "R4", "R5"]
    assert res.total_cost == 12.0

def test_dijkstra_unreachable_node():
    topo = create_small_network()
    # Isolate R5 completely
    topo.links["L_R4_R5"].status = "failed"
    topo.links["L_R2_R5"].status = "failed"
    res = dijkstra_shortest_path(topo, "R1", "R5", record_trace=False)
    assert res.is_reachable is False
    assert res.path == []
    assert res.total_cost == float("inf")

def test_dijkstra_invalid_nodes():
    topo = create_small_network()
    res = dijkstra_shortest_path(topo, "NON_EXISTENT", "R5", record_trace=False)
    assert res.is_reachable is False
    assert res.path == []

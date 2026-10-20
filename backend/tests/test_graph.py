import pytest
from app.models.graph import NetworkTopology, RouterNode, NetworkLink
from app.simulation.topologies import create_small_network, create_mesh_network, create_lab_network

def test_topology_creation():
    topo = create_small_network()
    assert len(topo.routers) == 5
    assert len(topo.links) == 7
    assert "R1" in topo.routers
    assert "R5" in topo.routers

def test_adjacency_list_active_links():
    topo = create_small_network()
    adj = topo.get_adjacency_list(include_failed=False)
    
    # R1 is connected to R2 and R3
    neighbors = [item[0] for item in adj["R1"]]
    assert "R2" in neighbors
    assert "R3" in neighbors

def test_adjacency_list_failed_link():
    topo = create_small_network()
    # Mark link between R1 and R2 as failed
    topo.links["L_R1_R2"].status = "failed"
    
    adj = topo.get_adjacency_list(include_failed=False)
    r1_neighbors = [item[0] for item in adj["R1"]]
    assert "R2" not in r1_neighbors
    assert "R3" in r1_neighbors

def test_adjacency_list_failed_router():
    topo = create_small_network()
    topo.routers["R2"].status = "failed"
    
    adj = topo.get_adjacency_list(include_failed=False)
    r1_neighbors = [item[0] for item in adj["R1"]]
    assert "R2" not in r1_neighbors

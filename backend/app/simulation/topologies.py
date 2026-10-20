from app.models.graph import NetworkTopology, RouterNode, NetworkLink

def create_small_network() -> NetworkTopology:
    """
    Small Network (5 routers)
    A clean 5-node graph ideal for stepping through Dijkstra's algorithm.
    """
    routers = {
        "R1": RouterNode(id="R1", label="Router 1 (Ingress)", x=100, y=250, queue_capacity=10, processing_delay_ms=20),
        "R2": RouterNode(id="R2", label="Router 2 (North)", x=350, y=100, queue_capacity=10, processing_delay_ms=20),
        "R3": RouterNode(id="R3", label="Router 3 (South)", x=350, y=400, queue_capacity=10, processing_delay_ms=20),
        "R4": RouterNode(id="R4", label="Router 4 (Mid)", x=600, y=250, queue_capacity=10, processing_delay_ms=20),
        "R5": RouterNode(id="R5", label="Router 5 (Egress)", x=850, y=250, queue_capacity=10, processing_delay_ms=20),
    }

    links = {
        "L_R1_R2": NetworkLink(id="L_R1_R2", source="R1", target="R2", cost=4.0, latency_ms=40, bandwidth_mbps=100),
        "L_R1_R3": NetworkLink(id="L_R1_R3", source="R1", target="R3", cost=2.0, latency_ms=20, bandwidth_mbps=100),
        "L_R2_R3": NetworkLink(id="L_R2_R3", source="R2", target="R3", cost=1.0, latency_ms=10, bandwidth_mbps=100),
        "L_R2_R4": NetworkLink(id="L_R2_R4", source="R2", target="R4", cost=5.0, latency_ms=50, bandwidth_mbps=100),
        "L_R3_R4": NetworkLink(id="L_R3_R4", source="R3", target="R4", cost=8.0, latency_ms=80, bandwidth_mbps=100),
        "L_R2_R5": NetworkLink(id="L_R2_R5", source="R2", target="R5", cost=10.0, latency_ms=100, bandwidth_mbps=100),
        "L_R4_R5": NetworkLink(id="L_R4_R5", source="R4", target="R5", cost=2.0, latency_ms=20, bandwidth_mbps=100),
    }

    return NetworkTopology(
        id="small",
        name="Small Network (5 Routers)",
        description="A canonical 5-node diamond network for learning Dijkstra's shortest-path algorithm and queueing.",
        routers=routers,
        links=links
    )

def create_mesh_network() -> NetworkTopology:
    """
    Mesh Network (7 routers)
    A rich interconnected topology with multiple alternative paths and redundant loops.
    """
    routers = {
        "A": RouterNode(id="A", label="Gateway Alpha", x=100, y=200, queue_capacity=15, processing_delay_ms=25),
        "B": RouterNode(id="B", label="Core North 1", x=320, y=80, queue_capacity=15, processing_delay_ms=20),
        "C": RouterNode(id="C", label="Core South 1", x=320, y=380, queue_capacity=15, processing_delay_ms=20),
        "D": RouterNode(id="D", label="Hub Center", x=540, y=220, queue_capacity=20, processing_delay_ms=15),
        "E": RouterNode(id="E", label="Core North 2", x=760, y=80, queue_capacity=15, processing_delay_ms=20),
        "F": RouterNode(id="F", label="Core South 2", x=760, y=380, queue_capacity=15, processing_delay_ms=20),
        "G": RouterNode(id="G", label="Gateway Omega", x=980, y=220, queue_capacity=15, processing_delay_ms=25),
    }

    links = {
        "L_A_B": NetworkLink(id="L_A_B", source="A", target="B", cost=3.0, latency_ms=30, bandwidth_mbps=100),
        "L_A_C": NetworkLink(id="L_A_C", source="A", target="C", cost=5.0, latency_ms=50, bandwidth_mbps=100),
        "L_A_D": NetworkLink(id="L_A_D", source="A", target="D", cost=9.0, latency_ms=90, bandwidth_mbps=100),
        "L_B_D": NetworkLink(id="L_B_D", source="B", target="D", cost=2.0, latency_ms=20, bandwidth_mbps=100),
        "L_B_E": NetworkLink(id="L_B_E", source="B", target="E", cost=7.0, latency_ms=70, bandwidth_mbps=100),
        "L_C_D": NetworkLink(id="L_C_D", source="C", target="D", cost=3.0, latency_ms=30, bandwidth_mbps=100),
        "L_C_F": NetworkLink(id="L_C_F", source="C", target="F", cost=6.0, latency_ms=60, bandwidth_mbps=100),
        "L_D_E": NetworkLink(id="L_D_E", source="D", target="E", cost=4.0, latency_ms=40, bandwidth_mbps=100),
        "L_D_F": NetworkLink(id="L_D_F", source="D", target="F", cost=4.0, latency_ms=40, bandwidth_mbps=100),
        "L_E_G": NetworkLink(id="L_E_G", source="E", target="G", cost=3.0, latency_ms=30, bandwidth_mbps=100),
        "L_F_G": NetworkLink(id="L_F_G", source="F", target="G", cost=5.0, latency_ms=50, bandwidth_mbps=100),
        "L_E_F": NetworkLink(id="L_E_F", source="E", target="F", cost=2.0, latency_ms=20, bandwidth_mbps=100),
    }

    return NetworkTopology(
        id="mesh",
        name="Mesh Network (7 Routers)",
        description="A redundant mesh topology with diverse interconnected paths, allowing multi-hop route testing.",
        routers=routers,
        links=links
    )

def create_lab_network() -> NetworkTopology:
    """
    Congestion & Failure Lab (8 routers)
    Explicitly designed to demonstrate primary bottleneck paths vs backup bypass paths.
    """
    routers = {
        "SRC": RouterNode(id="SRC", label="Origin (SRC)", x=80, y=260, queue_capacity=15, processing_delay_ms=20),
        "P1": RouterNode(id="P1", label="Primary Hop 1", x=300, y=140, queue_capacity=10, processing_delay_ms=20),
        "P2": RouterNode(id="P2", label="Primary Hop 2", x=540, y=140, queue_capacity=8, processing_delay_ms=30),  # Bottleneck
        "P3": RouterNode(id="P3", label="Primary Hop 3", x=780, y=140, queue_capacity=10, processing_delay_ms=20),
        "B1": RouterNode(id="B1", label="Backup North", x=420, y=20, queue_capacity=20, processing_delay_ms=15),
        "S1": RouterNode(id="S1", label="Secondary South 1", x=300, y=380, queue_capacity=15, processing_delay_ms=25),
        "S2": RouterNode(id="S2", label="Secondary South 2", x=640, y=380, queue_capacity=15, processing_delay_ms=25),
        "DST": RouterNode(id="DST", label="Target (DST)", x=1000, y=260, queue_capacity=15, processing_delay_ms=20),
    }

    links = {
        # Primary low-cost path (Total cost = 1 + 1 + 1 + 1 = 4)
        "L_SRC_P1": NetworkLink(id="L_SRC_P1", source="SRC", target="P1", cost=1.0, latency_ms=20, bandwidth_mbps=100),
        "L_P1_P2": NetworkLink(id="L_P1_P2", source="P1", target="P2", cost=1.0, latency_ms=25, bandwidth_mbps=50),
        "L_P2_P3": NetworkLink(id="L_P2_P3", source="P2", target="P3", cost=1.0, latency_ms=25, bandwidth_mbps=50),
        "L_P3_DST": NetworkLink(id="L_P3_DST", source="P3", target="DST", cost=1.0, latency_ms=20, bandwidth_mbps=100),
        
        # High-capacity bypass route around P2 (P1 -> B1 -> P3, cost = 2.5 + 2.5 = 5.0)
        "L_P1_B1": NetworkLink(id="L_P1_B1", source="P1", target="B1", cost=2.5, latency_ms=35, bandwidth_mbps=150),
        "L_B1_P3": NetworkLink(id="L_B1_P3", source="B1", target="P3", cost=2.5, latency_ms=35, bandwidth_mbps=150),
        
        # Secondary southern path (Cost = 3 + 3 + 3 = 9)
        "L_SRC_S1": NetworkLink(id="L_SRC_S1", source="SRC", target="S1", cost=3.0, latency_ms=45, bandwidth_mbps=80),
        "L_S1_S2": NetworkLink(id="L_S1_S2", source="S1", target="S2", cost=3.0, latency_ms=45, bandwidth_mbps=80),
        "L_S2_DST": NetworkLink(id="L_S2_DST", source="S2", target="DST", cost=3.0, latency_ms=45, bandwidth_mbps=80),
        
        # Cross links
        "L_P2_S2": NetworkLink(id="L_P2_S2", source="P2", target="S2", cost=4.0, latency_ms=50, bandwidth_mbps=80),
    }

    return NetworkTopology(
        id="lab",
        name="Congestion & Failure Lab (8 Routers)",
        description="Specifically engineered with primary bottleneck router P2, North bypass B1, and South backup S1-S2.",
        routers=routers,
        links=links
    )

BUILTIN_TOPOLOGIES = {
    "small": create_small_network,
    "mesh": create_mesh_network,
    "lab": create_lab_network,
}

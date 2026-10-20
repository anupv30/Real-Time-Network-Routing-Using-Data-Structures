import pytest
from app.models.packet import Packet, PacketPriority, PacketStatus, DropReason
from app.simulation.queue import RouterQueue

def test_fifo_queue_ordering():
    q = RouterQueue(router_id="R1", capacity=5, scheduling_policy="fifo")
    p1 = Packet(id="P1", source="R1", destination="R2")
    p2 = Packet(id="P2", source="R1", destination="R2")
    
    assert q.enqueue(p1) is True
    assert q.enqueue(p2) is True
    assert q.size() == 2
    
    # FIFO: First In First Out
    assert q.dequeue().id == "P1"
    assert q.dequeue().id == "P2"
    assert q.size() == 0

def test_priority_queue_ordering():
    q = RouterQueue(router_id="R1", capacity=10, scheduling_policy="priority")
    p_low = Packet(id="P_LOW", source="R1", destination="R2", priority=PacketPriority.LOW)
    p_normal = Packet(id="P_NORM", source="R1", destination="R2", priority=PacketPriority.NORMAL)
    p_high = Packet(id="P_HIGH", source="R1", destination="R2", priority=PacketPriority.HIGH)
    p_critical = Packet(id="P_CRIT", source="R1", destination="R2", priority=PacketPriority.CRITICAL)
    
    # Enqueue in reverse priority order
    q.enqueue(p_low)
    q.enqueue(p_normal)
    q.enqueue(p_high)
    q.enqueue(p_critical)
    
    # Must dequeue in strict priority order: CRITICAL -> HIGH -> NORMAL -> LOW
    assert q.dequeue().id == "P_CRIT"
    assert q.dequeue().id == "P_HIGH"
    assert q.dequeue().id == "P_NORM"
    assert q.dequeue().id == "P_LOW"

def test_tail_drop_on_queue_overflow():
    q = RouterQueue(router_id="R1", capacity=2, scheduling_policy="fifo")
    p1 = Packet(id="P1", source="R1", destination="R2")
    p2 = Packet(id="P2", source="R1", destination="R2")
    p3 = Packet(id="P3", source="R1", destination="R2")
    
    assert q.enqueue(p1) is True
    assert q.enqueue(p2) is True
    assert q.is_full() is True
    
    # Third packet should be dropped via tail drop
    assert q.enqueue(p3) is False
    assert p3.status == PacketStatus.DROPPED
    assert p3.drop_reason == DropReason.QUEUE_OVERFLOW
    assert q.total_dropped == 1
    assert q.size() == 2

def test_router_clear_on_failure():
    q = RouterQueue(router_id="R1", capacity=5, scheduling_policy="fifo")
    q.enqueue(Packet(id="P1", source="R1", destination="R2"))
    q.enqueue(Packet(id="P2", source="R1", destination="R2"))
    
    dropped = q.clear()
    assert len(dropped) == 2
    assert q.size() == 0
    assert q.total_dropped == 2
    for p in dropped:
        assert p.status == PacketStatus.DROPPED
        assert p.drop_reason == DropReason.ROUTER_FAILED

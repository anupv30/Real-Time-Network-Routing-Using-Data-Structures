import heapq
from collections import deque
from typing import List, Optional, Dict, Any
from app.models.packet import Packet, PacketPriority, PacketStatus, DropReason, PRIORITY_WEIGHTS

class RouterQueue:
    """
    Simulates a network router's packet queue with configurable scheduling and drop policies.
    Supports FIFO and Strict Priority scheduling.
    Implements Tail Drop when queue capacity is reached.
    """
    def __init__(self, router_id: str, capacity: int = 15, scheduling_policy: str = "fifo"):
        self.router_id = router_id
        self.capacity = max(1, capacity)
        self.scheduling_policy = scheduling_policy.lower()  # "fifo" or "priority"
        
        # Internal storage
        self._fifo_deque: deque[Packet] = deque()
        # Min-heap items: (priority_num, arrival_order, packet)
        self._priority_heap: List[tuple] = []
        self._arrival_counter: int = 0
        
        # Statistics
        self.total_enqueued: int = 0
        self.total_dequeued: int = 0
        self.total_dropped: int = 0
        
        # State
        self.is_processing: bool = False
        self.current_processing_packet: Optional[Packet] = None
        self.processing_finish_sim_time: Optional[float] = None

    def size(self) -> int:
        if self.scheduling_policy == "priority":
            return len(self._priority_heap)
        return len(self._fifo_deque)

    def is_full(self) -> bool:
        return self.size() >= self.capacity

    def utilization_pct(self) -> float:
        if self.capacity <= 0:
            return 0.0
        return min(100.0, (self.size() / self.capacity) * 100.0)

    def enqueue(self, packet: Packet) -> bool:
        """
        Attempts to enqueue a packet.
        If the queue is full, executes tail drop and returns False.
        Otherwise enqueues according to scheduling policy and returns True.
        """
        if self.is_full():
            # Tail drop
            packet.status = PacketStatus.DROPPED
            packet.drop_reason = DropReason.QUEUE_OVERFLOW
            self.total_dropped += 1
            return False

        packet.status = PacketStatus.QUEUED
        packet.current_router = self.router_id
        self.total_enqueued += 1
        self._arrival_counter += 1

        if self.scheduling_policy == "priority":
            priority_weight = PRIORITY_WEIGHTS.get(packet.priority, 2)
            heapq.heappush(self._priority_heap, (priority_weight, self._arrival_counter, packet))
        else:
            self._fifo_deque.append(packet)

        return True

    def dequeue(self) -> Optional[Packet]:
        """
        Removes and returns the next packet according to scheduling policy.
        """
        if self.size() == 0:
            return None

        self.total_dequeued += 1

        if self.scheduling_policy == "priority":
            _, _, packet = heapq.heappop(self._priority_heap)
            return packet
        else:
            return self._fifo_deque.popleft()

    def peek(self) -> Optional[Packet]:
        if self.size() == 0:
            return None
        if self.scheduling_policy == "priority":
            return self._priority_heap[0][2]
        return self._fifo_deque[0]

    def get_queued_packets(self) -> List[Packet]:
        """Returns ordered list of packets currently waiting in the queue."""
        if self.scheduling_policy == "priority":
            # Sort heap copy for read-only inspection without mutating heap
            sorted_items = sorted(self._priority_heap, key=lambda x: (x[0], x[1]))
            return [item[2] for item in sorted_items]
        return list(self._fifo_deque)

    def get_priority_breakdown(self) -> Dict[str, int]:
        counts = {p.value: 0 for p in PacketPriority}
        for pkt in self.get_queued_packets():
            counts[pkt.priority.value] = counts.get(pkt.priority.value, 0) + 1
        return counts

    def clear(self) -> List[Packet]:
        """Drops all currently queued packets (e.g. on router failure)."""
        dropped_packets = []
        while self.size() > 0:
            pkt = self.dequeue()
            if pkt:
                pkt.status = PacketStatus.DROPPED
                pkt.drop_reason = DropReason.ROUTER_FAILED
                self.total_dropped += 1
                dropped_packets.append(pkt)
        return dropped_packets

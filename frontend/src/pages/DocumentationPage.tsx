import React from 'react';
import {
  BookOpen,
  Share2,
  Layers,
  Activity,
  AlertTriangle,
  Shuffle,
  Cpu,
  CheckCircle2
} from 'lucide-react';

export const DocumentationPage: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0b0f19] space-y-6 text-gray-300">
      {/* Header */}
      <div className="rounded-xl bg-[#111827] border border-[#1f293d] p-5 shadow-lg">
        <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">
          <BookOpen className="w-4 h-4" />
          Technical Documentation & Architecture
        </div>
        <h2 className="text-xl font-bold text-gray-100">
          Real-Time Network Packet Routing Simulator Guide
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Detailed explanations of system architecture, data structures, routing algorithms, queue scheduling, and evaluation workflows.
        </p>
      </div>

      {/* Chapter 1: System Overview */}
      <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 space-y-3">
        <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          1. System Architecture & Authoritative State
        </h3>
        <p className="text-xs leading-relaxed text-gray-400">
          The application follows an authoritative client-server architecture:
        </p>
        <ul className="list-disc list-inside text-xs space-y-1.5 text-gray-400 pl-2">
          <li>
            <strong className="text-gray-200">Backend Simulation Engine:</strong> An asynchronous event-driven loop in Python/FastAPI advances network time in 50ms ticks. It authoritatively manages packet generation, router buffer queues, link propagation delays, hop transitions, packet drops, and dynamic rerouting.
          </li>
          <li>
            <strong className="text-gray-200">Native WebSockets:</strong> Live simulation updates and events are pushed in real time to connected clients using structured JSON snapshots and event payloads.
          </li>
          <li>
            <strong className="text-gray-200">Frontend Visualization:</strong> Built with React 19, TypeScript, Vite, Tailwind CSS, and React Flow. It renders the topology, smooth node/edge animations, in-transit packet overlays, live charts, and interactive controls without inventing packet movements client-side.
          </li>
          <li>
            <strong className="text-gray-200">Persistence:</strong> Embedded SQLite database with aiosqlite for storing topologies and recording simulation benchmark history runs.
          </li>
        </ul>
      </div>

      {/* Chapter 2: Dijkstra's Algorithm */}
      <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 space-y-3">
        <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
          <Share2 className="w-4 h-4 text-cyan-400" />
          2. Dijkstra's Shortest Path Algorithm
        </h3>
        <p className="text-xs leading-relaxed text-gray-400">
          Shortest paths are computed using Dijkstra's algorithm implemented with a binary min-heap (<code className="text-cyan-400">heapq</code>) over the network adjacency list:
        </p>
        <div className="bg-[#0d1322] border border-[#1f293d] rounded-lg p-3 font-mono text-xs text-gray-300 space-y-1">
          <div>Time Complexity: <strong className="text-cyan-400">O((V + E) log V)</strong></div>
          <div>Space Complexity: <strong className="text-cyan-400">O(V + E)</strong></div>
          <div className="text-gray-500 text-[11px] mt-1">
            Where V is the number of active routers and E is the number of active links.
          </div>
        </div>
        <p className="text-xs leading-relaxed text-gray-400">
          The algorithm guarantees non-negative edge relaxation, automatically ignores failed routers and severed links, and detects unreachable destinations. When requested, it emits a complete step-by-step min-heap execution trace (<code className="text-cyan-400">EXTRACT_MIN</code>, <code className="text-cyan-400">EVALUATE_EDGE</code>, <code className="text-cyan-400">RELAX_EDGE</code>, and <code className="text-cyan-400">REACHED_DEST</code>) for classroom demonstration.
        </p>
      </div>

      {/* Chapter 3: Router Queues & Scheduling */}
      <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 space-y-3">
        <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-400" />
          3. Router Queues, Scheduling Policies & Tail Drop
        </h3>
        <p className="text-xs leading-relaxed text-gray-400">
          Every router node in the topology owns a physical queue buffer (<code className="text-purple-400">RouterQueue</code>) with configurable capacity and processing delay:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-[#0d1322] border border-[#1f293d] rounded-lg p-3">
            <div className="font-bold text-gray-200 mb-1">FIFO Scheduling</div>
            <p className="text-gray-400 text-[11px]">
              Packets are processed and forwarded in the exact order of their arrival using a double-ended queue (<code className="text-gray-300">collections.deque</code>).
            </p>
          </div>
          <div className="bg-[#0d1322] border border-[#1f293d] rounded-lg p-3">
            <div className="font-bold text-gray-200 mb-1">Strict Priority Scheduling</div>
            <p className="text-gray-400 text-[11px]">
              Packets are scheduled using a min-heap by priority weight: <strong>Critical (0) &gt; High (1) &gt; Normal (2) &gt; Low (3)</strong>. Higher-priority packets always preempt lower-priority packets in the queue.
            </p>
          </div>
        </div>
        <div className="bg-rose-950/20 border border-rose-900/40 rounded-lg p-3 text-xs text-rose-300">
          <strong>Tail Drop Congestion Policy:</strong> When a router's queue reaches its configured maximum capacity, any subsequent incoming packet is dropped immediately with drop reason <code className="text-rose-200">QUEUE_OVERFLOW</code>, faithfully modeling hardware buffer exhaust.
        </div>
      </div>

      {/* Chapter 4: Demonstration Guide */}
      <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 space-y-3">
        <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          4. Examiner / Professor Demonstration Guide
        </h3>
        <div className="space-y-2 text-xs">
          <div className="bg-[#0d1322] border border-gray-800 rounded-lg p-3">
            <strong className="text-blue-400">Demo A — Shortest-Path Routing:</strong>
            <p className="text-gray-400 mt-1">
              Navigate to <strong>Routing (Dijkstra)</strong> tab. Select Source <strong>R1</strong> and Destination <strong>R5</strong>. Click <strong>Run Dijkstra Algorithm</strong>. Observe the computed path [R1 &rarr; R3 &rarr; R2 &rarr; R4 &rarr; R5] with total cost 10.0 and inspect the min-heap execution trace table.
            </p>
          </div>

          <div className="bg-[#0d1322] border border-gray-800 rounded-lg p-3">
            <strong className="text-amber-400">Demo B — Congestion & Tail Drop:</strong>
            <p className="text-gray-400 mt-1">
              Load the <strong>Mesh Network</strong> or <strong>Lab</strong>. Start the simulation with 4.0 pps. Click on router <strong>D</strong> (or P2) in the canvas and click <strong>Inject Congestion</strong>. Observe the queue buffer bar rise to 100%, followed by tail-drop packet losses in the KPI cards and Event Feed.
            </p>
          </div>

          <div className="bg-[#0d1322] border border-gray-800 rounded-lg p-3">
            <strong className="text-rose-400">Demo C — Dynamic Failure & Rerouting:</strong>
            <p className="text-gray-400 mt-1">
              Load <strong>Congestion & Failure Lab</strong>. Start transmission from <strong>SRC</strong> to <strong>DST</strong>. Fail primary router <strong>P2</strong> by clicking "Fail" on its node. Observe live packets dynamic rerouting across North backup <strong>B1</strong> or Southern route [S1 &rarr; S2]. Click "Restore" to observe restoration.
            </p>
          </div>

          <div className="bg-[#0d1322] border border-gray-800 rounded-lg p-3">
            <strong className="text-purple-400">Demo D — Multi-Priority Queuing:</strong>
            <p className="text-gray-400 mt-1">
              In Simulator or Queue Monitor, send a <strong>Low</strong> priority packet, then a <strong>Critical</strong> priority packet. Observe how the router dequeues and forwards the Critical packet ahead of the Low packet according to the min-heap priority scheduler.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

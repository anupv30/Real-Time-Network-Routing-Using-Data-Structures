import {
  SimulationStateSnapshot,
  ShortestPathResult,
  TopologySummary,
  SimulationHistoryRecord,
  PacketPriority,
  PacketJourneyDetails,
  RecentPacketSummary
} from '../types';

const API_BASE = '/api';

async function ensureOk(res: Response, fallbackMessage: string) {
  if (res.ok) return;
  const error = await res.json() as { detail?: string };
  throw new Error(error.detail || fallbackMessage);
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchTopologies(): Promise<{ topologies: TopologySummary[] }> {
  const res = await fetch(`${API_BASE}/topologies`);
  if (!res.ok) throw new Error('Failed to fetch topologies');
  return res.json();
}

export async function loadTopology(id: string) {
  const res = await fetch(`${API_BASE}/topologies/${id}/load`, { method: 'POST' });
  await ensureOk(res, 'Failed to load topology');
  return res.json();
}

export async function startSimulation() {
  const res = await fetch(`${API_BASE}/simulation/start`, { method: 'POST' });
  await ensureOk(res, 'Failed to start simulation');
  return res.json();
}

export async function pauseSimulation() {
  const res = await fetch(`${API_BASE}/simulation/pause`, { method: 'POST' });
  return res.json();
}

export async function resumeSimulation() {
  const res = await fetch(`${API_BASE}/simulation/resume`, { method: 'POST' });
  return res.json();
}

export async function stopSimulation() {
  const res = await fetch(`${API_BASE}/simulation/stop`, { method: 'POST' });
  return res.json();
}

export async function resetSimulation() {
  const res = await fetch(`${API_BASE}/simulation/reset`, { method: 'POST' });
  return res.json();
}

export async function stepSimulation() {
  const res = await fetch(`${API_BASE}/simulation/step`, { method: 'POST' });
  return res.json();
}

export async function fetchSimulationState(): Promise<SimulationStateSnapshot> {
  const res = await fetch(`${API_BASE}/simulation/state`);
  if (!res.ok) throw new Error('Failed to fetch simulation state');
  return res.json();
}

export async function updateSimulationConfig(config: {
  speed_multiplier?: number;
  auto_generate?: boolean;
  generation_rate_pps?: number;
  gen_source?: string;
  gen_destination?: string;
  gen_priority?: PacketPriority;
}) {
  const res = await fetch(`${API_BASE}/simulation/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  await ensureOk(res, 'Failed to update simulation configuration');
  return res.json();
}

export async function injectPacket(payload: {
  source: string;
  destination: string;
  priority: PacketPriority;
  payload_size?: number;
}) {
  const res = await fetch(`${API_BASE}/simulation/packet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  await ensureOk(res, 'Failed to inject packet');
  return res.json();
}

export async function injectPacketBurst(payload: {
  source: string;
  destination: string;
  count: number;
  priority?: PacketPriority;
  payload_size?: number;
}) {
  const res = await fetch(`${API_BASE}/simulation/packet/burst`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  await ensureOk(res, 'Failed to inject packet burst');
  return res.json();
}

export async function toggleRouterFailure(routerId: string) {
  const res = await fetch(`${API_BASE}/simulation/failure/router`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: routerId })
  });
  await ensureOk(res, 'Failed to change router status');
  return res.json();
}

export async function toggleLinkFailure(linkId: string) {
  const res = await fetch(`${API_BASE}/simulation/failure/link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: linkId })
  });
  await ensureOk(res, 'Failed to change link status');
  return res.json();
}

export async function toggleRouterCongestion(routerId: string) {
  const res = await fetch(`${API_BASE}/simulation/congestion/router`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: routerId })
  });
  await ensureOk(res, 'Failed to change router congestion');
  return res.json();
}

export async function setRouterSchedulingPolicy(routerId: string, policy: 'fifo' | 'priority') {
  const res = await fetch(`${API_BASE}/simulation/router/policy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: routerId, policy })
  });
  await ensureOk(res, 'Failed to update router scheduling policy');
  return res.json();
}

export async function toggleLinkCongestion(linkId: string) {
  const res = await fetch(`${API_BASE}/simulation/congestion/link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: linkId })
  });
  await ensureOk(res, 'Failed to change link congestion');
  return res.json();
}

export async function calculateDijkstra(
  source: string,
  destination: string,
  recordTrace: boolean = true
): Promise<ShortestPathResult> {
  const res = await fetch(`${API_BASE}/routing/dijkstra`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, destination, record_trace: recordTrace })
  });
  if (!res.ok) throw new Error('Dijkstra calculation failed');
  return res.json();
}

export async function fetchHistory(): Promise<{ history: SimulationHistoryRecord[] }> {
  const res = await fetch(`${API_BASE}/history`);
  return res.json();
}

export async function saveCurrentRunToHistory(topologyName?: string) {
  const res = await fetch(`${API_BASE}/history/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topology_name: topologyName })
  });
  return res.json();
}

export async function fetchRecentPackets(limit: number = 50): Promise<{ packets: RecentPacketSummary[]; total_retained: number }> {
  const res = await fetch(`${API_BASE}/packets/recent?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch recent packets');
  return res.json();
}

export async function fetchPacketJourney(packetId: string): Promise<PacketJourneyDetails> {
  const res = await fetch(`${API_BASE}/packets/${encodeURIComponent(packetId)}/journey`);
  await ensureOk(res, 'Failed to fetch packet journey');
  return res.json();
}

export async function fetchPacketDetails(packetId: string) {
  const res = await fetch(`${API_BASE}/packets/${encodeURIComponent(packetId)}`);
  await ensureOk(res, 'Failed to fetch packet details');
  return res.json();
}

import { useState, useEffect, useRef } from 'react';
import { SimulationStateSnapshot, PacketPriority } from '../types';
import * as api from '../services/api';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export function useSimulation() {
  const [snapshot, setSnapshot] = useState<SimulationStateSnapshot | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Initial fetch and WebSocket connect
  useEffect(() => {
    let active = true;
    let socket: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connectWs = () => {
      if (!active) return;
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return;
      }

      setConnectionStatus('reconnecting');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        const ws = new WebSocket(wsUrl);
        socket = ws;
        wsRef.current = ws;

        ws.onopen = () => {
          if (active && socket === ws) setConnectionStatus('connected');
        };

        ws.onmessage = (event) => {
          if (!active || socket !== ws) return;
          try {
            const data = JSON.parse(event.data);
            if (data && data.routers) setSnapshot(data);
          } catch (e) {
            console.error('Failed to parse WebSocket message', e);
          }
        };

        ws.onclose = () => {
          if (!active || socket !== ws) return;
          socket = null;
          wsRef.current = null;
          setConnectionStatus('disconnected');
          reconnectTimeout = setTimeout(connectWs, 2000);
        };

        ws.onerror = (err) => {
          if (active && socket === ws) {
            console.warn('WebSocket connection error; reconnecting after close.', err);
          }
        };
      } catch (e) {
        console.error('Failed to instantiate WebSocket', e);
        setConnectionStatus('disconnected');
        reconnectTimeout = setTimeout(connectWs, 3000);
      }
    };

    api.fetchSimulationState()
      .then((state) => {
        if (active) setSnapshot(state);
      })
      .catch((e) => {
        if (active) console.warn('Initial REST state fetch failed:', e);
      });

    const initialConnectTimeout = setTimeout(connectWs, 0);

    return () => {
      active = false;
      clearTimeout(initialConnectTimeout);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onclose = null;
        socket.onerror = null;
        socket.close();
      }
      if (wsRef.current === socket) wsRef.current = null;
    };
  }, []);

  const refreshSimulationSnapshot = async (
    state?: SimulationStateSnapshot['state']
  ) => {
    if (state) {
      setSnapshot((current) => current ? { ...current, state } : current);
    }
    setSnapshot(await api.fetchSimulationState());
  };

  // Actions
  const handleStart = async () => {
    const result = await api.startSimulation();
    await refreshSimulationSnapshot(result.state);
  };

  const handlePause = async () => {
    const result = await api.pauseSimulation();
    await refreshSimulationSnapshot(result.state);
  };

  const handleResume = async () => {
    const result = await api.resumeSimulation();
    await refreshSimulationSnapshot(result.state);
  };

  const handleStop = async () => {
    const result = await api.stopSimulation();
    await refreshSimulationSnapshot(result.state);
  };

  const handleReset = async () => {
    const result = await api.resetSimulation();
    await refreshSimulationSnapshot(result.state);
  };

  const handleStep = async () => {
    await api.stepSimulation();
    await refreshSimulationSnapshot();
  };

  const handleInjectPacket = async (source: string, destination: string, priority: PacketPriority) => {
    const result = await api.injectPacket({ source, destination, priority });
    await refreshSimulationSnapshot();
    return result;
  };

  const handleToggleRouterFailure = async (routerId: string) => {
    await api.toggleRouterFailure(routerId);
    await refreshSimulationSnapshot();
  };

  const handleToggleLinkFailure = async (linkId: string) => {
    await api.toggleLinkFailure(linkId);
    await refreshSimulationSnapshot();
  };

  const handleToggleRouterCongestion = async (routerId: string) => {
    await api.toggleRouterCongestion(routerId);
    await refreshSimulationSnapshot();
  };

  const handleToggleLinkCongestion = async (linkId: string) => {
    await api.toggleLinkCongestion(linkId);
    await refreshSimulationSnapshot();
  };

  const handleSetRouterSchedulingPolicy = async (
    routerId: string,
    policy: 'fifo' | 'priority'
  ) => {
    await api.setRouterSchedulingPolicy(routerId, policy);
    await refreshSimulationSnapshot();
  };

  const handleUpdateConfig = async (config: {
    speed_multiplier?: number;
    auto_generate?: boolean;
    generation_rate_pps?: number;
    gen_source?: string;
    gen_destination?: string;
    gen_priority?: PacketPriority;
  }) => {
    await api.updateSimulationConfig(config);
    await refreshSimulationSnapshot();
  };

  const handleLoadTopology = async (topologyId: string) => {
    await api.loadTopology(topologyId);
    setSelectedNodeId(null);
    setSelectedLinkId(null);
    await refreshSimulationSnapshot();
  };

  return {
    snapshot,
    connectionStatus,
    selectedNodeId,
    setSelectedNodeId,
    selectedLinkId,
    setSelectedLinkId,
    actions: {
      start: handleStart,
      pause: handlePause,
      resume: handleResume,
      stop: handleStop,
      reset: handleReset,
      step: handleStep,
      injectPacket: handleInjectPacket,
      toggleRouterFailure: handleToggleRouterFailure,
      setRouterSchedulingPolicy: handleSetRouterSchedulingPolicy,
      toggleLinkFailure: handleToggleLinkFailure,
      toggleRouterCongestion: handleToggleRouterCongestion,
      toggleLinkCongestion: handleToggleLinkCongestion,
      updateConfig: handleUpdateConfig,
      loadTopology: handleLoadTopology,
    }
  };
}

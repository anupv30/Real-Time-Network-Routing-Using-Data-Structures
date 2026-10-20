import React, { useState } from 'react';
import { SimulationStateSnapshot } from '../types';
import * as api from '../services/api';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { BarChart3, Save, CheckCircle2, TrendingUp, Clock, Gauge, Layers } from 'lucide-react';

interface AnalyticsPageProps {
  snapshot: SimulationStateSnapshot | null;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ snapshot }) => {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const snapshots = snapshot?.metric_snapshots || [];
  const metrics = snapshot?.metrics;

  const handleSaveToHistory = async () => {
    try {
      await api.saveCurrentRunToHistory();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      alert(e.message || 'Failed to save to history');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0b0f19] space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-[#111827] border border-[#1f293d] p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            Performance Analytics & Telemetry
          </div>
          <h2 className="text-xl font-bold text-gray-100">Live Simulation Metrics & Time-Series Charts</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Empirical throughput, end-to-end latency, packet delivery ratio, and queue occupancy over simulation time.
          </p>
        </div>

        <button
          onClick={handleSaveToHistory}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition"
        >
          {saveSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              Saved to History!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Run to History
            </>
          )}
        </button>
      </div>

      {/* KPI Metric Badges */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-4">
            <div className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Packet Delivery Ratio
            </div>
            <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">
              {metrics.delivery_ratio}%
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              Loss Ratio: {metrics.loss_ratio}% ({metrics.total_dropped} drops)
            </div>
          </div>

          <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-4">
            <div className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-amber-400" /> Network Throughput
            </div>
            <div className="text-2xl font-mono font-bold text-amber-400 mt-1">
              {metrics.throughput_pps} pps
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              Measured in sliding window
            </div>
          </div>

          <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-4">
            <div className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-400" /> End-to-End Latency
            </div>
            <div className="text-2xl font-mono font-bold text-purple-400 mt-1">
              {metrics.avg_latency_ms !== null ? `${metrics.avg_latency_ms} ms` : '—'}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              Min: {metrics.min_latency_ms ?? '—'}ms | Max: {metrics.max_latency_ms ?? '—'}ms
            </div>
          </div>

          <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-4">
            <div className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Buffer Utilization
            </div>
            <div className="text-2xl font-mono font-bold text-cyan-400 mt-1">
              {metrics.avg_queue_utilization_pct}%
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              Average across all routers
            </div>
          </div>
        </div>
      )}

      {/* 4 Interactive Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Delivered vs Dropped Packets Over Time */}
        <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-4 shadow-lg space-y-3">
          <div className="font-semibold text-gray-200 text-sm">
            Cumulative Delivered vs Dropped Packets
          </div>
          <div className="h-64 w-full">
            {snapshots.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={snapshots}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                  <XAxis dataKey="timestamp_sim_sec" stroke="#6b7280" tickFormatter={(v) => `${v}s`} />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#374151' }}
                    labelFormatter={(v) => `Sim Time: ${v}s`}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="delivered_count"
                    name="Delivered"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.2}
                  />
                  <Area
                    type="monotone"
                    dataKey="dropped_count"
                    name="Dropped"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400 font-mono">
                Start simulation to record real-time time-series data.
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Throughput (pps) */}
        <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-4 shadow-lg space-y-3">
          <div className="font-semibold text-gray-200 text-sm">
            Instantaneous Throughput (Packets / Second)
          </div>
          <div className="h-64 w-full">
            {snapshots.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={snapshots}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                  <XAxis dataKey="timestamp_sim_sec" stroke="#6b7280" tickFormatter={(v) => `${v}s`} />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#374151' }}
                    labelFormatter={(v) => `Sim Time: ${v}s`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="throughput_pps"
                    name="Throughput (pps)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400 font-mono">
                Start simulation to record real-time time-series data.
              </div>
            )}
          </div>
        </div>

        {/* Chart 3: Average Latency (ms) */}
        <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-4 shadow-lg space-y-3">
          <div className="font-semibold text-gray-200 text-sm">
            Average End-to-End Latency (ms)
          </div>
          <div className="h-64 w-full">
            {snapshots.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={snapshots}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                  <XAxis dataKey="timestamp_sim_sec" stroke="#6b7280" tickFormatter={(v) => `${v}s`} />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#374151' }}
                    labelFormatter={(v) => `Sim Time: ${v}s`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avg_latency_ms"
                    name="Latency (ms)"
                    stroke="#c084fc"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400 font-mono">
                Start simulation to record real-time time-series data.
              </div>
            )}
          </div>
        </div>

        {/* Chart 4: Queue & Link Utilization (%) */}
        <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-4 shadow-lg space-y-3">
          <div className="font-semibold text-gray-200 text-sm">
            Network Resource Utilization (%)
          </div>
          <div className="h-64 w-full">
            {snapshots.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={snapshots}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                  <XAxis dataKey="timestamp_sim_sec" stroke="#6b7280" tickFormatter={(v) => `${v}s`} />
                  <YAxis stroke="#6b7280" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#374151' }}
                    labelFormatter={(v) => `Sim Time: ${v}s`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="queue_utilization_pct"
                    name="Queue Utilization %"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="link_utilization_pct"
                    name="Link Utilization %"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400 font-mono">
                Start simulation to record real-time time-series data.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

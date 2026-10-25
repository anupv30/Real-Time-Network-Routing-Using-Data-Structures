import React, { useState } from 'react';
import { useSimulation } from './hooks/useSimulation';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { OverviewPage } from './pages/OverviewPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { TopologyPage } from './pages/TopologyPage';
import { RoutingPage } from './pages/RoutingPage';
import { QueueMonitorPage } from './pages/QueueMonitorPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { HistoryPage } from './pages/HistoryPage';
import { DocumentationPage } from './pages/DocumentationPage';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('simulator');
  const [shortestPathQuery, setShortestPathQuery] = useState<{ source: string; destination: string } | null>(null);
  const {
    snapshot,
    connectionStatus,
    selectedNodeId,
    setSelectedNodeId,
    selectedLinkId,
    setSelectedLinkId,
    actions,
  } = useSimulation();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0b0f19] text-gray-100 font-sans">
      {/* Top Navigation */}
      <Navbar
        connectionStatus={connectionStatus}
        simState={snapshot?.state || 'stopped'}
        simTimeMs={snapshot?.sim_time_ms || 0}
        speedMultiplier={snapshot?.speed_multiplier || 1.0}
        onStart={actions.start}
        onPause={actions.pause}
        onResume={actions.resume}
        onStop={actions.stop}
        onReset={actions.reset}
        onSpeedChange={(speed) => actions.updateConfig({ speed_multiplier: speed })}
      />

      {/* Main Body with Sidebar + Active Page */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="flex-1 flex flex-col overflow-hidden relative">
          {activeTab === 'overview' && (
            <OverviewPage
              snapshot={snapshot}
              onNavigate={setActiveTab}
              onLoadTopology={actions.loadTopology}
              onStart={actions.start}
              onInjectPacket={actions.injectPacket}
              onToggleRouterFailure={actions.toggleRouterFailure}
              onToggleRouterCongestion={actions.toggleRouterCongestion}
              onUpdateConfig={actions.updateConfig}
              onSetRouterSchedulingPolicy={actions.setRouterSchedulingPolicy}
              connectionStatus={connectionStatus}
            />
          )}

          {activeTab === 'simulator' && (
            <SimulatorPage
              snapshot={snapshot}
              selectedNodeId={selectedNodeId}
              selectedLinkId={selectedLinkId}
              onSelectNode={setSelectedNodeId}
              onSelectLink={setSelectedLinkId}
              onStart={actions.start}
              onPause={actions.pause}
              onResume={actions.resume}
              onStep={actions.step}
              onConfigChange={actions.updateConfig}
              onInjectPacket={actions.injectPacket}
              onToggleRouterFailure={actions.toggleRouterFailure}
              onToggleRouterCongestion={actions.toggleRouterCongestion}
              onToggleLinkFailure={actions.toggleLinkFailure}
              onToggleLinkCongestion={actions.toggleLinkCongestion}
              initialShortestPathQuery={shortestPathQuery}
              onClearShortestPathQuery={() => setShortestPathQuery(null)}
            />
          )}

          {activeTab === 'topology' && (
            <TopologyPage
              snapshot={snapshot}
              onLoadTopology={actions.loadTopology}
              onToggleRouterFailure={actions.toggleRouterFailure}
              onToggleRouterCongestion={actions.toggleRouterCongestion}
              onToggleLinkFailure={actions.toggleLinkFailure}
              onToggleLinkCongestion={actions.toggleLinkCongestion}
            />
          )}

          {activeTab === 'routing' && (
            <RoutingPage
              snapshot={snapshot}
              onHighlightInSimulator={(src, dst) => {
                setShortestPathQuery({ source: src, destination: dst });
                setActiveTab('simulator');
              }}
            />
          )}

          {activeTab === 'queue' && (
            <QueueMonitorPage
              snapshot={snapshot}
              selectedRouterId={selectedNodeId || undefined}
              onSelectRouter={setSelectedNodeId}
              onStart={actions.start}
              onPause={actions.pause}
              onResume={actions.resume}
              onStep={actions.step}
              onReset={actions.reset}
              onInjectPacket={actions.injectPacket}
              onInjectBurst={actions.injectPacketBurst}
              onSetRouterSchedulingPolicy={actions.setRouterSchedulingPolicy}
              onConfigChange={actions.updateConfig}
            />
          )}

          {activeTab === 'analytics' && <AnalyticsPage snapshot={snapshot} />}

          {activeTab === 'history' && <HistoryPage snapshot={snapshot} />}

          {activeTab === 'documentation' && <DocumentationPage />}
        </main>
      </div>
    </div>
  );
}

export default App;

import React from 'react';
import {
  LayoutDashboard,
  Network,
  GitBranch,
  Share2,
  Layers,
  BarChart3,
  History,
  BookOpen,
  Menu,
  X
} from 'lucide-react';

export type ActiveTab =
  | 'overview'
  | 'simulator'
  | 'topology'
  | 'routing'
  | 'queue'
  | 'analytics'
  | 'history'
  | 'documentation';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isOpen: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isOpen,
  onMouseEnter,
  onMouseLeave,
  onClose,
}) => {
  const navItems = [
    { id: 'overview' as ActiveTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'simulator' as ActiveTab, label: 'Simulator', icon: Network },
    { id: 'topology' as ActiveTab, label: 'Topology', icon: GitBranch },
    { id: 'routing' as ActiveTab, label: 'Routing (Dijkstra)', icon: Share2 },
    { id: 'queue' as ActiveTab, label: 'Queue Monitor', icon: Layers },
    { id: 'analytics' as ActiveTab, label: 'Analytics', icon: BarChart3 },
    { id: 'history' as ActiveTab, label: 'Sim History', icon: History },
    { id: 'documentation' as ActiveTab, label: 'Documentation', icon: BookOpen },
  ];

  return (
    <aside
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`fixed left-0 top-14 bottom-0 z-50 w-64 bg-[#0a0e1a]/95 backdrop-blur-md border-r border-[#1f293d] flex flex-col justify-between py-3 select-none shadow-2xl transition-all duration-300 ease-in-out ${
        isOpen
          ? 'translate-x-0 opacity-100 pointer-events-auto'
          : '-translate-x-full opacity-0 pointer-events-none'
      }`}
    >
      <div>
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 pb-3 mb-2 border-b border-[#1f293d]">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Menu className="w-4 h-4 text-cyan-400" />
            <span>Navigation Menu</span>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              title="Close Navigation Drawer"
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-[#141b2d] transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Navigation Items List */}
        <div className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  if (onClose) {
                    onClose();
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-blue-600/20 text-cyan-300 border border-cyan-500/30 font-semibold shadow-xs'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#141b2d]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-cyan-400' : 'text-gray-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* System Info Footer */}
      <div className="px-4 text-[11px] text-gray-400 border-t border-[#1f293d]/80 pt-3 font-mono space-y-1 bg-[#070b14]/50 mx-2 rounded-lg p-2.5">
        <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
          System Core
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Backend:</span>
          <span className="text-gray-300">FastAPI Async</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Engine:</span>
          <span className="text-gray-300">50ms Tick</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Routing:</span>
          <span className="text-emerald-400 font-bold">Min-Heap Dijkstra</span>
        </div>
      </div>
    </aside>
  );
};

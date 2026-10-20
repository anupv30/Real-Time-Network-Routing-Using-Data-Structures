import React from 'react';
import {
  LayoutDashboard,
  Network,
  GitBranch,
  Share2,
  Layers,
  BarChart3,
  History,
  BookOpen
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
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
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
    <aside className="w-56 bg-[#0a0e1a] border-r border-[#1f293d] flex flex-col justify-between py-4 select-none shrink-0">
      <div className="space-y-1 px-3">
        <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400 px-3 py-1 font-semibold">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#141b2d]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-gray-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* System Info footer */}
      <div className="px-4 text-[11px] text-gray-400 border-t border-[#1f293d]/60 pt-3 font-mono">
        <div>Backend: FastAPI / Async</div>
        <div>Engine: Tick @ 50ms</div>
        <div className="text-emerald-500">Dijkstra Min-Heap: Active</div>
      </div>
    </aside>
  );
};

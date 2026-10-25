import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PacketTrackerErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PacketTracker ErrorBoundary caught an unhandled exception:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-rose-950/40 border border-rose-500/50 rounded-lg text-rose-200 m-3 space-y-2 select-none text-xs">
          <div className="flex items-center gap-2 font-bold text-rose-300">
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Packet Journey Tracker Render Error</span>
          </div>
          <p className="text-[11px] text-rose-300/80 leading-relaxed">
            A rendering error occurred while displaying this packet's data:
          </p>
          <div className="p-2 bg-black/50 border border-rose-900/60 rounded font-mono text-[10px] text-rose-300 break-words">
            {this.state.error?.message || 'Unknown render exception'}
          </div>
          <button
            onClick={this.handleReset}
            type="button"
            className="w-full mt-2 py-1.5 px-3 rounded bg-rose-900/50 hover:bg-rose-900/80 border border-rose-500/50 text-rose-100 font-mono text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Tracker</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

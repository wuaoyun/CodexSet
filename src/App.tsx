/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Terminal, Sliders, Cpu, Activity, LayoutDashboard, Settings as SettingsIcon, BookOpen, RefreshCw, Power 
} from 'lucide-react';
import { Provider, Settings, LogEntry, SystemStats } from './types';
import Overview from './components/Overview';
import ProviderSettings from './components/ProviderSettings';
import SessionLogs from './components/SessionLogs';
import Guide from './components/Guide';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'providers' | 'logs' | 'guide'>('providers');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRebooting, setIsRebooting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all basic information
  const fetchData = async () => {
    try {
      const [settingsRes, providersRes, logsRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/providers'),
        fetch('/api/logs')
      ]);

      if (settingsRes.ok && providersRes.ok && logsRes.ok) {
        const settingsData = await settingsRes.json();
        const providersData = await providersRes.json();
        const logsData = await logsRes.json();

        setSettings(settingsData.settings);
        setStats(settingsData.stats);
        setProviders(providersData);
        setLogs(logsData);

        // sync reboot state
        if (settingsData.settings.codexStatus === 'restarting') {
          setIsRebooting(true);
        } else {
          setIsRebooting(false);
        }
      }
    } catch (err) {
      console.error('Failed to fetch stats from CodexSet Backend:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Run on mount and establish polling for real-time dashboard updates
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 2000); // refresh stats & logs every 2 seconds

    return () => clearInterval(interval);
  }, []);

  // Set active provider
  const handleActivateProvider = async (id: string) => {
    try {
      const res = await fetch(`/api/providers/${id}/activate`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        // refresh immediately
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Clear configurations completely
  const handleClearActive = async () => {
    try {
      const res = await fetch('/api/providers/clear-active', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle provider switching
  const handleToggleSwitching = async (enabled: boolean) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enableSwitching: enabled })
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Edit provider
  const handleUpdateProvider = async (id: string, updated: Partial<Provider>) => {
    try {
      const res = await fetch(`/api/providers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create custom provider
  const handleCreateProvider = async (newProv: Omit<Provider, 'id'>) => {
    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProv)
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete provider
  const handleDeleteProvider = async (id: string) => {
    try {
      const res = await fetch(`/api/providers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger Codex reboot
  const handleReboot = async () => {
    setIsRebooting(true);
    try {
      const res = await fetch('/api/codex/reboot', { method: 'POST' });
      if (res.ok) {
        // start temporary polling/loading
        setTimeout(() => {
          setIsRebooting(false);
          fetchData();
        }, 2200);
      }
    } catch (e) {
      setIsRebooting(false);
      console.error(e);
    }
  };

  // Clear system logs
  const handleClearLogs = async () => {
    try {
      const res = await fetch('/api/logs/clear', { method: 'POST' });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getBreadcrumb = () => {
    switch (activeTab) {
      case 'overview': return '核心概览';
      case 'providers': return '供应商配置';
      case 'logs': return '会话管理';
      default: return '配置与集成指南';
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden" id="app-root">
      
      {/* 1. Left Navigation Sidebar */}
      <aside className="w-64 border-r border-zinc-900 bg-zinc-950 flex flex-col justify-between shrink-0" id="sidebar">
        <div>
          {/* Logo and Brand Title */}
          <div className="p-6 border-b border-zinc-900 flex items-center gap-3" id="brand-header">
            <div className="flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2 py-1 rounded-lg text-sm tracking-wider font-mono">
              CSet
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide text-zinc-100 font-mono">CodexSet</h1>
              <p className="text-[10px] text-zinc-500 font-mono">管理控制台 v2.1.0</p>
            </div>
          </div>

          {/* Navigation Menu Links */}
          <nav className="p-4 space-y-1" id="nav-links">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'overview'
                  ? 'bg-zinc-900/60 text-emerald-400 border border-zinc-800'
                  : 'text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              概览
            </button>

            <button
              onClick={() => setActiveTab('providers')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'providers'
                  ? 'bg-zinc-900/60 text-emerald-400 border border-zinc-800'
                  : 'text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <Sliders className="w-4 h-4" />
              供应商配置
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'logs'
                  ? 'bg-zinc-900/60 text-emerald-400 border border-zinc-800'
                  : 'text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <Terminal className="w-4 h-4" />
              会话管理与日志
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'guide'
                  ? 'bg-zinc-900/60 text-emerald-400 border border-zinc-800'
                  : 'text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              工具与集成指南
            </button>
          </nav>
        </div>

        {/* Sidebar Footer - Real-time active connection indicator */}
        <div className="p-4 border-t border-zinc-900" id="sidebar-footer">
          <div className="bg-zinc-900/40 rounded-lg p-3 border border-zinc-800/50 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <span>状态监控</span>
              <span className="flex items-center gap-1">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  isRebooting 
                    ? 'bg-amber-400 animate-spin' 
                    : settings?.enableSwitching ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'
                }`}></span>
                {isRebooting ? '重启中' : settings?.enableSwitching ? '运行中' : '已断开'}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <span>活动供应商</span>
              <span className="text-zinc-300 truncate max-w-[100px] font-semibold">
                {settings?.activeProviderId 
                  ? providers.find(p => p.id === settings.activeProviderId)?.name || '未匹配'
                  : '未选择'
                }
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Main Work Area */}
      <div className="flex-1 flex flex-col min-w-0" id="main-content-area">
        
        {/* Header Bar */}
        <header className="h-16 border-b border-zinc-900 bg-zinc-950 flex items-center justify-between px-6 shrink-0" id="main-header">
          <div className="flex items-center gap-2" id="breadcrumbs">
            <span className="text-xs text-zinc-500 font-medium">供应商配置</span>
            <span className="text-zinc-600 text-xs">/</span>
            <span className="text-xs text-zinc-200 font-semibold">{getBreadcrumb()}</span>
          </div>

          <div className="flex items-center gap-3" id="header-actions">
            {/* Direct Reboot button on top bar */}
            <button
              onClick={handleReboot}
              disabled={isRebooting}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border shadow-sm transition-all ${
                isRebooting
                  ? 'bg-zinc-800 border-zinc-750 text-zinc-500 cursor-not-allowed'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 active:scale-95'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRebooting ? 'animate-spin' : ''}`} />
              {isRebooting ? '正在重启...' : '重启 Codex'}
            </button>

            <button
              onClick={fetchData}
              className="p-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
              title="手动刷新"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Dashboard Work Views */}
        <main className="flex-1 overflow-y-auto p-6 bg-zinc-950/40 relative" id="main-workspace">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 gap-3">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
              <span className="text-xs text-zinc-500 font-mono">正在连接 Codex 拦截代理核心...</span>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto">
              {activeTab === 'overview' && (
                <Overview 
                  settings={settings}
                  stats={stats}
                  onReboot={handleReboot}
                  onRefresh={fetchData}
                  isRebooting={isRebooting}
                />
              )}

              {activeTab === 'providers' && (
                <ProviderSettings
                  providers={providers}
                  settings={settings}
                  onActivate={handleActivateProvider}
                  onClearActive={handleClearActive}
                  onToggleSwitching={handleToggleSwitching}
                  onUpdateProvider={handleUpdateProvider}
                  onDeleteProvider={handleDeleteProvider}
                  onCreateProvider={handleCreateProvider}
                />
              )}

              {activeTab === 'logs' && (
                <SessionLogs 
                  logs={logs}
                  onClearLogs={handleClearLogs}
                  onRefreshLogs={fetchData}
                />
              )}

              {activeTab === 'guide' && (
                <Guide />
              )}
            </div>
          )}
        </main>
      </div>

    </div>
  );
}

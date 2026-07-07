/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, Trash2, RefreshCw, AlertTriangle, CheckCircle, Info, Database, Play, Check 
} from 'lucide-react';
import { LogEntry } from '../types';

interface SessionLogsProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  onRefreshLogs: () => void;
}

export default function SessionLogs({ logs, onClearLogs, onRefreshLogs }: SessionLogsProps) {
  const [filter, setFilter] = useState<'all' | 'request' | 'success' | 'info' | 'warning' | 'error'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll) {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.type === filter;
  });

  const getLogColorClass = (type: LogEntry['type']) => {
    switch (type) {
      case 'request':
        return 'text-sky-400 border-sky-950/40 bg-sky-950/10';
      case 'success':
        return 'text-emerald-400 border-emerald-950/40 bg-emerald-950/10';
      case 'warning':
        return 'text-amber-400 border-amber-950/40 bg-amber-950/10';
      case 'error':
        return 'text-rose-400 border-rose-950/40 bg-rose-950/10';
      default:
        return 'text-zinc-400 border-zinc-800/60 bg-zinc-900/10';
    }
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'request':
        return <Database className="w-3.5 h-3.5 mt-0.5 shrink-0" />;
      case 'success':
        return <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />;
      case 'error':
        return <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />;
      default:
        return <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />;
    }
  };

  const getLogLabel = (type: LogEntry['type']) => {
    switch (type) {
      case 'request': return 'API_PROXY';
      case 'success': return 'SUCCESS';
      case 'warning': return 'WARNING';
      case 'error': return 'FATAL';
      default: return 'SYSTEM';
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl flex flex-col h-[calc(100vh-220px)] min-h-[500px]" id="session-logs-view">
      {/* Header and filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5 mb-5" id="logs-header">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <div>
            <h2 className="text-base font-semibold text-zinc-200">拦截中转终端与实时日志</h2>
            <p className="text-xs text-zinc-500 mt-0.5">捕获客户端 (如 Cursor, Zed) 发起的所有 API 请求与转换细节</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap" id="logs-controls">
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-850" id="logs-filter-group">
            {(['all', 'request', 'success', 'warning', 'error'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-2.5 py-1.5 rounded-md font-medium capitalize transition-colors ${
                  filter === f 
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {f === 'all' ? '全部' : f === 'request' ? '拦截请求' : f === 'success' ? '请求成功' : f === 'warning' ? '告警' : '错误'}
              </button>
            ))}
          </div>

          <button
            onClick={onRefreshLogs}
            className="p-2 bg-zinc-950 border border-zinc-850 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
            title="手动刷新日志"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={onClearLogs}
            className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-850 hover:bg-rose-950/20 hover:text-rose-400 hover:border-rose-900/30 px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            清空终端
          </button>
        </div>
      </div>

      {/* Terminal logs area */}
      <div className="flex-1 bg-zinc-950 border border-zinc-850 rounded-xl p-4 md:p-5 font-mono text-xs overflow-y-auto space-y-3 shadow-inner flex flex-col justify-between" id="logs-terminal-output">
        <div className="space-y-3.5">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <div 
                key={log.id} 
                className={`p-3 rounded-lg border flex items-start gap-3 transition-colors ${getLogColorClass(log.type)}`}
              >
                <div className="shrink-0">{getLogIcon(log.type)}</div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold px-1.5 py-0.5 rounded bg-black/30 text-[10px] tracking-wider border border-white/5 font-mono">
                        {getLogLabel(log.type)}
                      </span>
                      <span className="text-zinc-300 leading-relaxed font-sans font-medium">{log.message}</span>
                    </div>
                    <span className="text-[10px] text-zinc-600 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {log.details && (
                    <div className="mt-2 bg-black/40 border border-white/5 rounded p-2 text-[11px] font-mono text-zinc-400 whitespace-pre-wrap leading-relaxed break-all">
                      {log.details}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-zinc-600 italic text-center py-20 flex flex-col items-center justify-center gap-3">
              <Terminal className="w-8 h-8 text-zinc-800" />
              <span>当前无符合条件的日志</span>
            </div>
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>

      {/* Autoscroll checkbox */}
      <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
        <div className="flex items-center gap-1.5">
          <input
            type="checkbox"
            id="autoscroll-checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="w-3.5 h-3.5 accent-emerald-500 rounded text-emerald-500 bg-zinc-950 border-zinc-800 focus:ring-emerald-500/20 cursor-pointer"
          />
          <label htmlFor="autoscroll-checkbox" className="cursor-pointer">
            启用自动滚动到底部 (Auto Scroll)
          </label>
        </div>
        <div>
          共计 {filteredLogs.length} 条记录 (最大留存 150 条)
        </div>
      </div>
    </div>
  );
}

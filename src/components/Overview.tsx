/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, RefreshCw, Cpu, Activity, Database, Sparkles, Terminal, CheckCircle2, AlertTriangle, Send 
} from 'lucide-react';
import { Settings, SystemStats } from '../types';

interface OverviewProps {
  settings: Settings | null;
  stats: SystemStats | null;
  onReboot: () => void;
  onRefresh: () => void;
  isRebooting: boolean;
}

export default function Overview({ settings, stats, onReboot, onRefresh, isRebooting }: OverviewProps) {
  const [prompt, setPrompt] = useState('你好！请问你能正常工作吗？请简短回答。');
  const [testResult, setTestResult] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testModel, setTestModel] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const streamEndRef = useRef<HTMLDivElement>(null);

  // Fetch available models for active provider to populate quick test
  useEffect(() => {
    if (settings?.activeProviderId) {
      fetch('/api/providers')
        .then(res => res.json())
        .then(data => {
          const active = data.find((p: any) => p.id === settings.activeProviderId);
          if (active) {
            setAvailableModels(active.models.map((m: any) => m.name));
            setTestModel(active.defaultModel || active.models[0]?.name || '');
          }
        })
        .catch(err => console.error(err));
    }
  }, [settings?.activeProviderId]);

  // Handle rapid proxy connection test with streaming response
  const handleTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testModel) return;

    setTestLoading(true);
    setTestResult('');

    try {
      const response = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: testModel,
          messages: [{ role: 'user', content: prompt }],
          stream: true
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('流式读取器初始化失败');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        buffer += text;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data:')) {
            try {
              const data = JSON.parse(trimmed.slice(5).trim());
              const content = data.choices?.[0]?.delta?.content || '';
              if (content) {
                setTestResult(prev => prev + content);
              }
            } catch (e) {
              // Ignore lines that aren't JSON
            }
          }
        }
      }
    } catch (err: any) {
      setTestResult(`❌ 测试失败: ${err.message}\n\n可能的原因：\n1. 上游 API 无法连接。\n2. 您的 API 密钥未配置或已失效。\n3. 您使用的是 Google AI Studio Key 预设，但未正确填充 GEMINI_API_KEY。`);
    } finally {
      setTestLoading(false);
    }
  };

  useEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [testResult]);

  return (
    <div className="space-y-6" id="overview-view">
      {/* Upper Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="stats-grid">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-emerald-500/30 transition-all duration-300 shadow-lg" id="stat-card-uptime">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-sm font-medium">服务正常运行时间</span>
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-semibold text-zinc-100 font-mono tracking-tight">
            {stats ? stats.uptime : '-- : -- : --'}
          </div>
          <div className="text-xs text-zinc-500 mt-1">后台代理守护进程存活</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-emerald-500/30 transition-all duration-300 shadow-lg" id="stat-card-requests">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-sm font-medium">已拦截请求总数</span>
            <Database className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-semibold text-zinc-100 font-mono tracking-tight">
            {stats ? stats.requestCount : '0'}
          </div>
          <div className="text-xs text-zinc-500 mt-1">兼容 GPT 与 Claude</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-emerald-500/30 transition-all duration-300 shadow-lg" id="stat-card-conns">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-sm font-medium">当前活跃流式连接</span>
            <Cpu className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-semibold text-emerald-400 font-mono tracking-tight">
            {stats ? stats.activeConnections : '0'}
          </div>
          <div className="text-xs text-zinc-500 mt-1">高并发非阻塞代理中</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-emerald-500/30 transition-all duration-300 shadow-lg" id="stat-card-memory">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-sm font-medium">内存占用</span>
            <Terminal className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-semibold text-zinc-100 font-mono tracking-tight">
            {stats ? stats.memoryUsage : '0 MB'}
          </div>
          <div className="text-xs text-zinc-500 mt-1">高并发高性能 Node/V8</div>
        </div>
      </div>

      {/* Main Control Panel and Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="overview-main-grid">
        {/* Core Controls */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg flex flex-col justify-between lg:col-span-1" id="core-control-panel">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                守护进程状态
              </h2>
              <button 
                onClick={onRefresh}
                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors"
                title="刷新状态"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5">
              <div className="bg-zinc-950 border border-zinc-800/80 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-zinc-500">Codex 拦截代理端口</div>
                  <div className="text-sm font-medium text-zinc-200 font-mono mt-0.5">3000 (Ingress Active)</div>
                </div>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
                  LISTEN
                </span>
              </div>

              <div className="bg-zinc-950 border border-zinc-800/80 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-zinc-500">当前拦截引擎切换模式</div>
                  <div className="text-sm font-medium text-zinc-200 mt-0.5">
                    {settings?.enableSwitching ? '✅ 已挂载 (重定向开启)' : '📴 穿透模式 (原样直连)'}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                  settings?.enableSwitching 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}>
                  {settings?.enableSwitching ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>

              <div className="bg-zinc-950 border border-zinc-800/80 rounded-lg p-4">
                <div className="text-xs text-zinc-500 mb-1.5">Codex 启动指令</div>
                <input 
                  type="text" 
                  value={settings?.codexStartupCommand || ''} 
                  readOnly
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded text-xs font-mono focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-800/60">
            <button
              onClick={onReboot}
              disabled={isRebooting}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium shadow-md transition-all duration-300 ${
                isRebooting 
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700' 
                  : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 active:scale-[0.98]'
              }`}
            >
              <RefreshCw className={`w-5 h-5 ${isRebooting ? 'animate-spin' : ''}`} />
              {isRebooting ? '正在重启 Codex ...' : '一键重启 Codex'}
            </button>
            <p className="text-[11px] text-zinc-500 text-center mt-2">
              点击将安全断开现有进程、清空内存并重新绑定拦截端口。
            </p>
          </div>
        </div>

        {/* Diagnostic / AI Tester */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg lg:col-span-2 flex flex-col justify-between" id="ai-rapid-tester">
          <div>
            <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              代理联通性极速测试
            </h2>
            <p className="text-xs text-zinc-400 mb-5">
              无需配置开发工具，直接在此向代理后台发送消息，快速检验当前选择的供应商和模型是否正常联通和流式返回。
            </p>

            <form onSubmit={handleTestSubmit} className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs text-zinc-500 mb-1">测试目标模型</label>
                  <select
                    value={testModel}
                    onChange={(e) => setTestModel(e.target.value)}
                    disabled={testLoading}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 px-3 py-2 rounded-lg text-sm font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                  >
                    {availableModels.length > 0 ? (
                      availableModels.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))
                    ) : (
                      <option value="">(请先在配置页选择或启用供应商)</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-1">提示词 (Prompt)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={testLoading}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 pl-3 pr-10 py-2.5 rounded-lg text-sm focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={testLoading || !testModel}
                    className="absolute right-1.5 top-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-zinc-950 p-1.5 rounded-md transition-all duration-200"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="mt-5 flex-1 flex flex-col">
            <label className="block text-xs text-zinc-500 mb-1.5 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              返回流式内容 (Streamed Completion Delta)
            </label>
            <div className="flex-1 min-h-[160px] bg-zinc-950 border border-zinc-800 rounded-lg p-4 font-mono text-sm overflow-y-auto max-h-[220px] text-zinc-300 whitespace-pre-wrap relative shadow-inner">
              {testResult ? (
                <div>
                  {testResult}
                  {testLoading && <span className="inline-block w-1.5 h-4 bg-emerald-400 animate-pulse ml-0.5"></span>}
                </div>
              ) : (
                <div className="text-zinc-600 italic flex flex-col items-center justify-center h-full gap-2">
                  <span>等待极速测试发送...</span>
                  <span className="text-[11px] text-zinc-700 bg-zinc-900 border border-zinc-800/60 px-2 py-1 rounded">
                    接口：POST http://localhost:3000/v1/chat/completions
                  </span>
                </div>
              )}
              <div ref={streamEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

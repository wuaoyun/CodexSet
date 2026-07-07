/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, Save, Trash2, ArrowLeft, Check, CheckCircle2, Sliders, ExternalLink, Eye, EyeOff, LayoutGrid, AlertCircle 
} from 'lucide-react';
import { Provider, Settings, ProviderProtocol, ModelConfig } from '../types';

interface ProviderSettingsProps {
  providers: Provider[];
  settings: Settings | null;
  onActivate: (id: string) => void;
  onClearActive: () => void;
  onToggleSwitching: (enabled: boolean) => void;
  onUpdateProvider: (id: string, updated: Partial<Provider>) => void;
  onDeleteProvider: (id: string) => void;
  onCreateProvider: (newProv: Omit<Provider, 'id'>) => void;
}

export default function ProviderSettings({
  providers,
  settings,
  onActivate,
  onClearActive,
  onToggleSwitching,
  onUpdateProvider,
  onDeleteProvider,
  onCreateProvider
}: ProviderSettingsProps) {
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  // Preset models default database
  const PRESET_TEMPLATES = [
    {
      name: 'OpenAI Official',
      baseUrl: 'https://api.openai.com/v1',
      protocol: 'chat_completions' as ProviderProtocol,
      defaultModel: 'gpt-4o-mini',
      models: [
        { name: 'gpt-4o', contextWindow: '128K' },
        { name: 'gpt-4o-mini', contextWindow: '128K' }
      ]
    },
    {
      name: 'Anthropic Claude Official',
      baseUrl: 'https://api.anthropic.com',
      protocol: 'anthropic_messages' as ProviderProtocol,
      defaultModel: 'claude-3-5-sonnet-latest',
      models: [
        { name: 'claude-3-5-sonnet-latest', contextWindow: '200K' },
        { name: 'claude-3-5-haiku-latest', contextWindow: '200K' }
      ]
    },
    {
      name: 'DeepSeek Official',
      baseUrl: 'https://api.deepseek.com/v1',
      protocol: 'chat_completions' as ProviderProtocol,
      defaultModel: 'deepseek-chat',
      models: [
        { name: 'deepseek-chat', contextWindow: '64K' },
        { name: 'deepseek-coder', contextWindow: '64K' }
      ]
    },
    {
      name: 'SiliconFlow (硅基流动)',
      baseUrl: 'https://api.siliconflow.cn/v1',
      protocol: 'chat_completions' as ProviderProtocol,
      defaultModel: 'deepseek-ai/DeepSeek-V3',
      models: [
        { name: 'deepseek-ai/DeepSeek-V3', contextWindow: '64K' },
        { name: 'deepseek-ai/DeepSeek-R1', contextWindow: '64K' }
      ]
    },
    {
      name: 'OpenRouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      protocol: 'chat_completions' as ProviderProtocol,
      defaultModel: 'google/gemini-2.5-flash',
      models: [
        { name: 'google/gemini-2.5-flash', contextWindow: '1M' },
        { name: 'anthropic/claude-3.5-sonnet', contextWindow: '200K' }
      ]
    }
  ];

  const handleEditClick = (prov: Provider) => {
    setEditingProvider(JSON.parse(JSON.stringify(prov))); // Deep clone
    setIsAddingNew(false);
  };

  const handleCreateFromTemplate = (tmpl: typeof PRESET_TEMPLATES[0]) => {
    const newProv: Omit<Provider, 'id'> = {
      name: `${tmpl.name} Custom`,
      baseUrl: tmpl.baseUrl,
      key: '',
      protocol: tmpl.protocol,
      defaultModel: tmpl.defaultModel,
      models: [...tmpl.models],
      isPreset: false
    };
    setEditingProvider({
      ...newProv,
      id: 'temp-create',
    });
    setIsAddingNew(true);
  };

  const handleCreateFromScratch = () => {
    const newProv: Omit<Provider, 'id'> = {
      name: '新供应商',
      baseUrl: 'https://api.example.com/v1',
      key: '',
      protocol: 'chat_completions',
      defaultModel: 'gpt-3.5-turbo',
      models: [{ name: 'gpt-3.5-turbo', contextWindow: '16K' }],
      isPreset: false
    };
    setEditingProvider({
      ...newProv,
      id: 'temp-create',
    });
    setIsAddingNew(true);
  };

  const handleSave = () => {
    if (!editingProvider) return;

    if (!editingProvider.name.trim() || !editingProvider.baseUrl.trim()) {
      alert('名称和 Base URL 不能为空！');
      return;
    }

    if (isAddingNew) {
      // Omit temporary ID
      const { id, ...data } = editingProvider;
      onCreateProvider(data);
    } else {
      onUpdateProvider(editingProvider.id, editingProvider);
    }

    setEditingProvider(null);
    setIsAddingNew(false);
  };

  const handleAddModelRow = () => {
    if (!editingProvider) return;
    setEditingProvider({
      ...editingProvider,
      models: [...editingProvider.models, { name: '', contextWindow: '' }]
    });
  };

  const handleRemoveModelRow = (index: number) => {
    if (!editingProvider) return;
    const filtered = editingProvider.models.filter((_, i) => i !== index);
    setEditingProvider({
      ...editingProvider,
      models: filtered
    });
  };

  const handleModelRowChange = (index: number, field: keyof ModelConfig, value: string) => {
    if (!editingProvider) return;
    const updatedModels = [...editingProvider.models];
    updatedModels[index] = {
      ...updatedModels[index],
      [field]: value
    };
    setEditingProvider({
      ...editingProvider,
      models: updatedModels
    });
  };

  const toggleShowKey = (id: string) => {
    setShowKey(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Rendering Detail Form Editor
  if (editingProvider) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-6" id="provider-editor">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <button
            onClick={() => { setEditingProvider(null); setIsAddingNew(false); }}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </button>
          <div className="flex items-center gap-2">
            {editingProvider.id !== 'temp-create' && (
              <button
                onClick={() => {
                  onActivate(editingProvider.id);
                  setEditingProvider(null);
                }}
                className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-zinc-950 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
              >
                设为当前活动
              </button>
            )}
            <button
              onClick={handleSave}
              className="flex items-center gap-1 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 text-xs px-3.5 py-1.5 rounded-lg font-medium shadow transition-all"
            >
              <Save className="w-4 h-4" />
              保存配置
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 font-medium">供应商名称</label>
              <input
                type="text"
                value={editingProvider.name}
                onChange={e => setEditingProvider({ ...editingProvider, name: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3.5 py-2.5 text-zinc-100 text-sm focus:border-emerald-500 focus:outline-none transition-colors"
                placeholder="例如: DeepSeek-Custom"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 font-medium">接入协议 / 转换模式</label>
              <select
                value={editingProvider.protocol}
                onChange={e => setEditingProvider({ ...editingProvider, protocol: e.target.value as ProviderProtocol })}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3.5 py-2.5 text-zinc-100 text-sm focus:border-emerald-500 focus:outline-none transition-colors"
              >
                <option value="chat_completions">Chat Completions (OpenAI 协议 / GPT-style)</option>
                <option value="anthropic_messages">Anthropic Messages (Claude 协议 / Claude-style)</option>
              </select>
              <p className="text-[11px] text-zinc-500 mt-1.5">
                {editingProvider.protocol === 'anthropic_messages' 
                  ? '⚠️ 选择 Claude 协议后，控制台会自动将客户端的 OpenAI 格式请求转译为 Claude 格式，并完美翻译流式返回。'
                  : '🟢 选择 OpenAI 协议，适合大多数兼容 API，包括 DeepSeek、硅基流动、OpenRouter 或 OpenAI 官方端点。'
                }
              </p>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Base URL</label>
              <input
                type="text"
                value={editingProvider.baseUrl}
                onChange={e => setEditingProvider({ ...editingProvider, baseUrl: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3.5 py-2.5 text-zinc-100 text-sm focus:border-emerald-500 focus:outline-none transition-colors font-mono"
                placeholder="https://api.openai.com/v1"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                支持直连或中转代理。如果客户不提供 /v1，控制台会全自动处理，无需手动增添。
              </p>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 font-medium">API Key</label>
              <div className="relative">
                <input
                  type={showKey[editingProvider.id] ? "text" : "password"}
                  value={editingProvider.key}
                  onChange={e => setEditingProvider({ ...editingProvider, key: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg pl-3.5 pr-10 py-2.5 text-zinc-100 text-sm focus:border-emerald-500 focus:outline-none transition-colors font-mono"
                  placeholder={editingProvider.id === 'gemini-studio' ? '已绑定后台 AI Studio Secret Key' : '输入供应商提供的 API 秘钥'}
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey(editingProvider.id)}
                  className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showKey[editingProvider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                若留空，控制台将在拦截时尝试提取客户端请求里携带的 Bearer 令牌（即支持多账户透传）。
              </p>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 font-medium">首选模型名称</label>
              <input
                type="text"
                value={editingProvider.defaultModel}
                onChange={e => setEditingProvider({ ...editingProvider, defaultModel: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3.5 py-2.5 text-zinc-100 text-sm focus:border-emerald-500 focus:outline-none transition-colors font-mono"
                placeholder="例如: gpt-4o-mini"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                当客户端未指定模型或请求占位模型时，控制台以此作为默认退路。
              </p>
            </div>
          </div>

          {/* Model configurations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs text-zinc-400 font-medium">模型列表及上下文窗口映射</label>
              <button
                type="button"
                onClick={handleAddModelRow}
                className="text-emerald-400 hover:text-emerald-300 text-xs flex items-center gap-1 font-medium bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded border border-emerald-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                添加模型
              </button>
            </div>

            <div className="bg-zinc-950 border border-zinc-850 rounded-lg p-3 max-h-[420px] overflow-y-auto space-y-2 shadow-inner">
              {editingProvider.models.length > 0 ? (
                editingProvider.models.map((model, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={model.name}
                      onChange={e => handleModelRowChange(idx, 'name', e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-100 font-mono focus:border-emerald-500 focus:outline-none"
                      placeholder="模型名称 (e.g. gpt-4o)"
                    />
                    <input
                      type="text"
                      value={model.contextWindow}
                      onChange={e => handleModelRowChange(idx, 'contextWindow', e.target.value)}
                      className="w-24 bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-100 font-mono text-center focus:border-emerald-500 focus:outline-none"
                      placeholder="窗口大小 (e.g. 128K)"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveModelRow(idx)}
                      className="text-zinc-500 hover:text-rose-400 p-1.5 hover:bg-rose-500/10 rounded transition-colors"
                      title="删除模型"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-zinc-600 text-xs text-center py-6">
                  未配置任何子模型。请点击右上角添加模型行。
                </div>
              )}
            </div>
            <p className="text-[11px] text-zinc-500">
              提示：上下文窗口仅作为控制台内信息预览展示，模型调用请填写该供应商支持的标准大模型 ID。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="provider-list-view">
      {/* OpenAI ENV Detected panel */}
      {settings?.openaiEnvDetected && (
        <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3 shadow-sm" id="openai-env-banner">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-emerald-400">检测到后台 OPENAI_API_KEY 环境变量</h4>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              您的容器底层已成功挂载了 OPENAI_API_KEY 环境变量，当供应商配置中 Key 留空时，将自动通过透传模式直接验证直连，您可以在客户端随意发送请求。
            </p>
          </div>
        </div>
      )}

      {/* Global Config Switchers */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4" id="global-switching-bar">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="enable-switching"
            checked={settings?.enableSwitching || false}
            onChange={e => onToggleSwitching(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-500 bg-zinc-950 border-zinc-850 accent-emerald-500 focus:ring-emerald-500/20"
          />
          <div>
            <label htmlFor="enable-switching" className="text-sm font-medium text-zinc-200 cursor-pointer block">
              启用供应商配置切换
            </label>
            <p className="text-xs text-zinc-500 mt-0.5">
              关闭后，控制台代理处于断开/穿透状态，无法在本地代理并切换任何上游服务，直接发出错误通知。
            </p>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={onClearActive}
            disabled={!settings?.activeProviderId}
            className={`text-xs px-3.5 py-2 rounded-lg font-medium border transition-all duration-200 ${
              settings?.activeProviderId
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500 hover:text-zinc-950'
                : 'bg-zinc-800/40 text-zinc-600 border-zinc-800/80 cursor-not-allowed'
            }`}
          >
            完全去掉模型配置
          </button>
          <button
            onClick={handleCreateFromScratch}
            className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs px-4 py-2 rounded-lg font-medium shadow flex items-center gap-1 transition-all"
          >
            <Plus className="w-4 h-4" />
            手动添加供应商
          </button>
        </div>
      </div>

      {/* Quick Creator from Preset Templates */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-3" id="quick-preset-creator">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-medium text-zinc-200">一键从预设模板创建新的供应商</h3>
        </div>
        <div className="flex flex-wrap gap-2.5" id="presets-buttons-container">
          {PRESET_TEMPLATES.map((tmpl, i) => (
            <button
              key={i}
              onClick={() => handleCreateFromTemplate(tmpl)}
              className="bg-zinc-950 border border-zinc-850 hover:border-emerald-500/30 hover:bg-zinc-900/60 text-zinc-300 hover:text-zinc-100 text-xs px-3.5 py-2.5 rounded-lg font-medium flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-500" />
              {tmpl.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of existing Providers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="providers-grid">
        {providers.map((prov) => {
          const isActive = settings?.activeProviderId === prov.id;
          return (
            <div 
              key={prov.id}
              className={`bg-zinc-900 border rounded-xl p-5 shadow-md flex flex-col justify-between transition-all duration-300 ${
                isActive 
                  ? 'border-emerald-500 shadow-emerald-950/10 ring-1 ring-emerald-500/30' 
                  : 'border-zinc-800/80 hover:border-zinc-750'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-950 text-zinc-400'}`}>
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                        {prov.name}
                        {prov.isPreset && (
                          <span className="text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 px-1.5 py-0.5 rounded-sm font-mono">
                            PRESET
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-zinc-500 font-mono mt-0.5 truncate max-w-[210px]">{prov.baseUrl}</p>
                    </div>
                  </div>

                  {isActive && (
                    <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded font-medium">
                      <Check className="w-3 h-3" />
                      当前活动
                    </span>
                  )}
                </div>

                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between text-xs bg-zinc-950 border border-zinc-850 rounded-lg p-2.5">
                    <span className="text-zinc-500">协议协议 / 转换</span>
                    <span className="text-zinc-300 font-mono">
                      {prov.protocol === 'anthropic_messages' ? 'Anthropic Messages' : 'Chat Completions'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-zinc-950 border border-zinc-850 rounded-lg p-2.5">
                    <span className="text-zinc-500">配置模型数量</span>
                    <span className="text-zinc-300 font-mono font-medium">{prov.models.length} 个模型</span>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-zinc-950 border border-zinc-850 rounded-lg p-2.5">
                    <span className="text-zinc-500">首选模型</span>
                    <span className="text-zinc-300 font-mono bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded truncate max-w-[150px]">
                      {prov.defaultModel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-5 pt-4 border-t border-zinc-800/50">
                {!isActive ? (
                  <button
                    onClick={() => onActivate(prov.id)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 hover:border-emerald-500/20 hover:bg-emerald-500 hover:text-zinc-950 text-xs py-2 rounded-lg font-medium transition-all"
                  >
                    设为当前
                  </button>
                ) : (
                  <div className="flex-1 text-center bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 text-xs py-2 rounded-lg font-medium font-mono">
                    ACTIVE
                  </div>
                )}
                
                <button
                  onClick={() => handleEditClick(prov)}
                  className="bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs py-2 px-3.5 rounded-lg font-medium transition-colors"
                >
                  编辑详情
                </button>

                {!prov.isPreset && (
                  <button
                    onClick={() => {
                      if (confirm(`确定要删除自定义供应商 ${prov.name} 吗？`)) {
                        onDeleteProvider(prov.id);
                      }
                    }}
                    className="bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 p-2 rounded-lg transition-colors"
                    title="删除自定义配置"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

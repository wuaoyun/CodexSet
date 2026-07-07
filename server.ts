/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { exec, spawn, execSync, ChildProcess } from 'child_process';
import { createServer as createViteServer } from 'vite';
import { Provider, Settings, LogEntry, SystemStats, ModelConfig } from './src/types.js';

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default Presets
const DEFAULT_PRESETS: Provider[] = [
  {
    id: 'openai-official',
    name: 'OpenAI Official',
    baseUrl: 'https://api.openai.com/v1',
    key: '',
    protocol: 'chat_completions',
    defaultModel: 'gpt-4o-mini',
    models: [
      { name: 'gpt-4o', contextWindow: '128K' },
      { name: 'gpt-4o-mini', contextWindow: '128K' },
      { name: 'o1-mini', contextWindow: '128K' },
      { name: 'o3-mini', contextWindow: '200K' }
    ],
    isPreset: true
  },
  {
    id: 'deepseek-official',
    name: 'DeepSeek Official',
    baseUrl: 'https://api.deepseek.com/v1',
    key: '',
    protocol: 'chat_completions',
    defaultModel: 'deepseek-chat',
    models: [
      { name: 'deepseek-chat', contextWindow: '64K' },
      { name: 'deepseek-coder', contextWindow: '64K' }
    ],
    isPreset: true
  },
  {
    id: 'claude-official',
    name: 'Anthropic Claude Official',
    baseUrl: 'https://api.anthropic.com',
    key: '',
    protocol: 'anthropic_messages',
    defaultModel: 'claude-3-5-sonnet-latest',
    models: [
      { name: 'claude-3-5-sonnet-latest', contextWindow: '200K' },
      { name: 'claude-3-5-haiku-latest', contextWindow: '200K' },
      { name: 'claude-3-opus-latest', contextWindow: '200K' }
    ],
    isPreset: true
  },
  {
    id: 'gemini-studio',
    name: 'Google Gemini (AI Studio Key)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    key: process.env.GEMINI_API_KEY || '',
    protocol: 'chat_completions',
    defaultModel: 'gemini-2.5-flash',
    models: [
      { name: 'gemini-2.5-flash', contextWindow: '1M' },
      { name: 'gemini-2.5-pro', contextWindow: '2M' },
      { name: 'gemini-1.5-flash', contextWindow: '1M' }
    ],
    isPreset: true
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow (硅基流动)',
    baseUrl: 'https://api.siliconflow.cn/v1',
    key: '',
    protocol: 'chat_completions',
    defaultModel: 'deepseek-ai/DeepSeek-V3',
    models: [
      { name: 'deepseek-ai/DeepSeek-V3', contextWindow: '64K' },
      { name: 'deepseek-ai/DeepSeek-R1', contextWindow: '64K' },
      { name: 'THUDM/glm-4-9b-chat', contextWindow: '32K' }
    ],
    isPreset: true
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    key: '',
    protocol: 'chat_completions',
    defaultModel: 'google/gemini-2.5-flash',
    models: [
      { name: 'google/gemini-2.5-flash', contextWindow: '1M' },
      { name: 'anthropic/claude-3.5-sonnet', contextWindow: '200K' },
      { name: 'deepseek/deepseek-chat', contextWindow: '64K' }
    ],
    isPreset: true
  }
];

// Initial State Definition
let state = {
  settings: {
    enableSwitching: true,
    activeProviderId: 'gemini-studio', // Use Gemini as default out of the box
    codexStartupCommand: 'codex --proxy-port 3000',
    codexStatus: 'running' as const,
    openaiEnvDetected: !!process.env.OPENAI_API_KEY
  } as Settings,
  providers: [...DEFAULT_PRESETS] as Provider[],
  logs: [
    {
      id: 'log-init',
      timestamp: new Date().toISOString(),
      type: 'info' as const,
      message: 'CodexSet 控制台后端初始化成功',
      details: '已检测到系统环境并载入预设供应商。'
    }
  ] as LogEntry[],
  requestCount: 0,
  activeConnections: 0,
  startTime: Date.now()
};

// Load saved config if exists
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.settings) state.settings = { ...state.settings, ...parsed.settings };
      if (parsed.providers) {
        // Merge saved keys into presets and load custom providers
        const savedMap = new Map<string, Provider>();
        parsed.providers.forEach((p: Provider) => savedMap.set(p.id, p));

        state.providers = state.providers.map(preset => {
          const saved = savedMap.get(preset.id);
          if (saved) {
            return {
              ...preset,
              key: saved.key || preset.key,
              baseUrl: saved.baseUrl || preset.baseUrl,
              protocol: saved.protocol || preset.protocol,
              defaultModel: saved.defaultModel || preset.defaultModel,
              models: saved.models || preset.models
            };
          }
          return preset;
        });

        // Add user-created providers
        parsed.providers.forEach((p: Provider) => {
          if (!p.isPreset && !state.providers.some(exist => exist.id === p.id)) {
            state.providers.push(p);
          }
        });
      }
      state.logs.push({
        id: `log-load-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'success',
        message: '成功载入本地持久化配置文件 (config.json)'
      });
    } else {
      saveConfig();
    }
  } catch (err) {
    console.error('Failed to load configuration:', err);
    state.logs.push({
      id: `log-err-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'error',
      message: '载入配置文件失败，采用默认值',
      details: String(err)
    });
  }
}

// Save configuration to file
function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({
      settings: state.settings,
      providers: state.providers
    }, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save configuration:', err);
  }
}

// Helpers
function addLog(type: LogEntry['type'], message: string, details?: string) {
  const newLog: LogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    type,
    message,
    details
  };
  state.logs.push(newLog);
  // Keep last 150 logs
  if (state.logs.length > 150) {
    state.logs.shift();
  }
}

// Background Codex process management
let codexProcess: ChildProcess | null = null;

function findCodexExecutable(): string {
  const possiblePaths = [
    'codex', // global PATH
    './node_modules/.bin/codex',
    path.join(process.cwd(), 'node_modules', '.bin', 'codex'),
    path.join(process.cwd(), 'bin', 'codex'),
    path.join(process.env.HOME || '', '.npm-global', 'bin', 'codex'),
    path.join(process.env.HOME || '', '.local', 'bin', 'codex'),
    '/usr/local/bin/codex',
    '/usr/bin/codex'
  ];

  for (const p of possiblePaths) {
    try {
      if (p === 'codex') {
        if (process.platform !== 'win32') {
          execSync('which codex');
          return 'codex';
        }
      } else if (fs.existsSync(p)) {
        return p;
      }
    } catch (e) {
      // ignore and check next
    }
  }

  return 'codex'; // fallback
}

function killExistingCodex() {
  if (codexProcess) {
    try {
      codexProcess.kill('SIGTERM');
      addLog('info', '[Codex Daemon] 成功发送 SIGTERM 终止由控制台托管的 codex 进程');
      codexProcess = null;
    } catch (err) {
      addLog('warning', '[Codex Daemon] 尝试终止托管的 codex 进程时遇到问题', String(err));
    }
  }

  // Also clean up any processes matching name 'codex --' or similar to make sure the port is free
  try {
    if (process.platform !== 'win32') {
      execSync("pkill -f 'codex --' || true");
      addLog('info', '[Codex Daemon] 已清理系统中残留的后台 codex 进程');
    }
  } catch (err) {
    // ignore
  }
}

function startCodex(execPath: string) {
  addLog('info', `[Codex Daemon] 正在通过 ${execPath} 挂载后台服务...`);
  
  const commandParts = state.settings.codexStartupCommand.split(/\s+/);
  const args = commandParts.slice(1);

  try {
    addLog('info', `[Codex Daemon] 实际执行命令: ${execPath} ${args.join(' ')}`);
    
    codexProcess = spawn(execPath, args, {
      cwd: process.cwd(),
      env: { ...process.env, FORCE_COLOR: '1' },
      shell: true
    });

    if (codexProcess) {
      codexProcess.stdout?.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          addLog('info', `[Codex Output] ${output}`);
        }
      });

      codexProcess.stderr?.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          addLog('warning', `[Codex Warning] ${output}`);
        }
      });

      codexProcess.on('error', (err) => {
        addLog('error', `[Codex Process Error] 运行中遭遇异常: ${err.message}`);
      });

      codexProcess.on('close', (code) => {
        addLog('warning', `[Codex Process Close] codex 进程已终止，退出码: ${code}`);
        if (state.settings.codexStatus === 'running') {
          state.settings.codexStatus = 'stopped';
        }
      });
    }
  } catch (err: any) {
    addLog('error', `[Codex Daemon] 启动失败: ${err.message}`);
  }
}

// Initialize config
loadConfig();

// Middleware
app.use(express.json());

// CORS Setup
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key, anthropic-version');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// System Stats helper
function getSystemStats(): SystemStats {
  const diff = Date.now() - state.startTime;
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  const uptime = `${hours}h ${minutes}m ${seconds}s`;

  const mem = process.memoryUsage();
  const memoryUsage = `${Math.round(mem.rss / 1024 / 1024)} MB`;

  return {
    uptime,
    requestCount: state.requestCount,
    activeConnections: state.activeConnections,
    memoryUsage
  };
}

// --- API ROUTES ---

// Get Configuration Summary
app.get('/api/settings', (req, res) => {
  res.json({
    settings: state.settings,
    stats: getSystemStats()
  });
});

// Update Settings
app.post('/api/settings', (req, res) => {
  const { enableSwitching, activeProviderId, codexStartupCommand } = req.body;
  
  if (enableSwitching !== undefined) state.settings.enableSwitching = enableSwitching;
  if (activeProviderId !== undefined) state.settings.activeProviderId = activeProviderId;
  if (codexStartupCommand !== undefined) state.settings.codexStartupCommand = codexStartupCommand;

  saveConfig();
  addLog('info', '全局配置已更新', JSON.stringify(req.body));
  res.json({ success: true, settings: state.settings });
});

// Get Providers List
app.get('/api/providers', (req, res) => {
  res.json(state.providers);
});

// Create/Add Custom Provider
app.post('/api/providers', (req, res) => {
  const providerData: Omit<Provider, 'id'> = req.body;
  const newProvider: Provider = {
    ...providerData,
    id: `custom-${Date.now()}`,
    isPreset: false
  };

  state.providers.push(newProvider);
  saveConfig();
  addLog('success', `成功添加供应商: ${newProvider.name}`, `接入模式: ${newProvider.protocol}`);
  res.json({ success: true, provider: newProvider });
});

// Update Provider Details
app.put('/api/providers/:id', (req, res) => {
  const { id } = req.params;
  const index = state.providers.findIndex(p => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: '供应商未找到' });
  }

  // Preserve preset flag & ID
  state.providers[index] = {
    ...state.providers[index],
    ...req.body,
    id, // protect ID
    isPreset: state.providers[index].isPreset
  };

  saveConfig();
  addLog('info', `已更新供应商配置: ${state.providers[index].name}`);
  res.json({ success: true, provider: state.providers[index] });
});

// Delete Provider
app.delete('/api/providers/:id', (req, res) => {
  const { id } = req.params;
  const p = state.providers.find(prov => prov.id === id);
  if (!p) return res.status(404).json({ error: '供应商未找到' });

  if (p.isPreset) {
    return res.status(400).json({ error: '系统预设供应商不能被删除，只能修改其配置' });
  }

  state.providers = state.providers.filter(prov => prov.id !== id);
  if (state.settings.activeProviderId === id) {
    state.settings.activeProviderId = 'gemini-studio';
  }

  saveConfig();
  addLog('warning', `删除了供应商: ${p.name}`);
  res.json({ success: true });
});

// Set Provider as Active (切换配置)
app.post('/api/providers/:id/activate', (req, res) => {
  const { id } = req.params;
  const provider = state.providers.find(p => p.id === id);

  if (!provider) {
    return res.status(404).json({ error: '供应商未找到' });
  }

  state.settings.activeProviderId = id;
  state.settings.enableSwitching = true; // Auto enable when user sets active
  saveConfig();
  
  addLog('success', `切换模型配置到: ${provider.name}`, `默认首选模型: ${provider.defaultModel}`);
  res.json({ success: true, settings: state.settings });
});

// Remove Configurations completely (完全去掉配置)
app.post('/api/providers/clear-active', (req, res) => {
  state.settings.activeProviderId = null;
  state.settings.enableSwitching = false;
  saveConfig();

  addLog('warning', '已完全清除当前活动模型配置', 'Codex 现在回到干净的无劫持状态。');
  res.json({ success: true, settings: state.settings });
});

// Reboot Codex (一键重启)
app.post('/api/codex/reboot', (req, res) => {
  state.settings.codexStatus = 'restarting';
  addLog('info', '正在执行 Codex 一键重启指令...', `配置启动命令: ${state.settings.codexStartupCommand}`);

  // 1. Terminate any running codex processes
  killExistingCodex();

  // 2. Auto-detect codex installation
  const detectedPath = findCodexExecutable();
  addLog('info', `[自动探测] 已成功自动识别并定位 Codex 安装路径: ${detectedPath}`);

  // 3. Start codex in the background with a slight delay to allow ports to free
  setTimeout(() => {
    startCodex(detectedPath);
    state.settings.codexStatus = 'running';
    addLog('success', 'Codex 核心服务重启成功！核心功能现已正常可用，后台拦截中。');
  }, 1000);

  res.json({ success: true });
});

// System Logs
app.get('/api/logs', (req, res) => {
  res.json(state.logs);
});

app.post('/api/logs/clear', (req, res) => {
  state.logs = [
    {
      id: `log-clear-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'info',
      message: '控制台日志已被清空'
    }
  ];
  res.json({ success: true });
});


// --- HIGH-PERFORMANCE MULTI-ROUTE LLM API PROXY LAYER ---

// This catch-all middleware intercepts all LLM requests targeting standard route variations
// and automatically directs them to the active model provider with fully supported SSE streaming!
app.all([
  '/v1/chat/completions', '/chat/completions',
  '/v1/completions', '/completions',
  '/v1/messages', '/messages',
  '/v1/models', '/models'
], async (req, res) => {
  state.requestCount++;
  state.activeConnections++;

  const requestedPath = req.path;
  const isChatCompletions = requestedPath.endsWith('/chat/completions');
  const isCompletions = requestedPath.endsWith('/completions') && !isChatCompletions;
  const isMessages = requestedPath.endsWith('/messages');
  const isModels = requestedPath.endsWith('/models');

  addLog('request', `捕获请求: [${req.method}] ${requestedPath}`, `请求源: ${req.get('user-agent') || 'Unknown Client'}`);

  // If switcher is off or no active provider, we fail gracefully or default to mock
  if (!state.settings.enableSwitching || !state.settings.activeProviderId) {
    state.activeConnections--;
    addLog('warning', '拦截到请求，但由于供应商切换未启用，该请求被拒绝。');
    return res.status(400).json({
      error: {
        message: "CodexSet model switching is disabled. Enable it in the Control Panel.",
        type: "config_error",
        param: null,
        code: "switching_disabled"
      }
    });
  }

  const provider = state.providers.find(p => p.id === state.settings.activeProviderId);
  if (!provider) {
    state.activeConnections--;
    addLog('error', `未找到当前配置的活动供应商: ID 为 ${state.settings.activeProviderId}`);
    return res.status(500).json({ error: { message: "Active provider configuration not found" } });
  }

  // Extract client bearer key or fallback to provider's pre-configured key
  const authHeader = req.get('Authorization') || '';
  const clientApiKey = authHeader.replace(/^Bearer\s+/i, '') || req.get('x-api-key') || '';
  const targetKey = provider.key || clientApiKey;

  if (!targetKey && provider.id !== 'gemini-studio') {
    state.activeConnections--;
    addLog('warning', `供应商 ${provider.name} 缺少 API Key，可能导致上游调用失败。`);
  }

  // Adjust model: if client doesn't supply a model, or if the client requests some placeholder,
  // we default to the provider's default model, or preserve client's model if they supplied one.
  let requestBody = { ...req.body };
  if (isChatCompletions || isMessages) {
    if (!requestBody.model) {
      requestBody.model = provider.defaultModel;
    }
  }

  try {
    // Determine Destination URL based on provider protocol and endpoint requested
    let targetUrl = '';
    let targetHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Auto support custom User-Agent if configured
    if (provider.userAgent) {
      targetHeaders['User-Agent'] = provider.userAgent;
    } else {
      targetHeaders['User-Agent'] = 'Codex-Plus-Plus-Proxy/1.0';
    }

    // Append custom configured headers if any
    if (provider.customHeaders && provider.customHeaders.length > 0) {
      provider.customHeaders.forEach(h => {
        if (h.key && h.value) targetHeaders[h.key] = h.value;
      });
    }

    // PROTOCOL ENGINE
    if (provider.protocol === 'anthropic_messages') {
      // UPSTREAM IS ANTHROPIC (CLAUDE)
      targetHeaders['x-api-key'] = targetKey;
      targetHeaders['anthropic-version'] = '2023-06-01';

      if (isChatCompletions) {
        // CLIENT IS OPENAI (Cursor, Zed) BUT UPSTREAM IS CLAUDE
        // We must perform real-time request mapping!
        addLog('info', `[协议转换] OpenAI ChatCompletions -> Anthropic Messages (${provider.name})`);
        
        targetUrl = provider.baseUrl.endsWith('/v1/messages') 
          ? provider.baseUrl 
          : `${provider.baseUrl.replace(/\/+$/, '')}/v1/messages`;

        // Map messages: role 'system' should be elevated to a root parameter in Anthropic
        let systemPrompt = '';
        const mappedMessages = (requestBody.messages || [])
          .filter((m: any) => {
            if (m.role === 'system') {
              systemPrompt = m.content;
              return false; // remove system messages from messages list
            }
            return true;
          })
          .map((m: any) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
          }));

        const anthropicBody: Record<string, any> = {
          model: requestBody.model.replace(/^gpt-.*$/, provider.defaultModel), // Force fallback if OpenAI dummy model used
          messages: mappedMessages,
          max_tokens: requestBody.max_tokens || 4096,
          stream: requestBody.stream || false,
          temperature: requestBody.temperature !== undefined ? requestBody.temperature : 1.0
        };

        if (systemPrompt) {
          anthropicBody.system = systemPrompt;
        }

        requestBody = anthropicBody;

      } else {
        // Direct messages proxying
        targetUrl = provider.baseUrl.endsWith('/v1/messages') 
          ? provider.baseUrl 
          : `${provider.baseUrl.replace(/\/+$/, '')}/v1/messages`;
        
        // Ensure Anthropic key is set in header
        targetHeaders['x-api-key'] = targetKey;
      }

    } else {
      // UPSTREAM IS OPENAI COMPATIBLE (OpenAI, DeepSeek, Gemini-compatibility, SiliconFlow, OpenRouter)
      if (targetKey) {
        targetHeaders['Authorization'] = `Bearer ${targetKey}`;
      }

      // Automatically append '/v1' or normal API routes if the base URL doesn't specify it,
      // ensuring users are fully protected even if they omit "/v1".
      let normalizedBase = provider.baseUrl.replace(/\/+$/, '');
      
      // Smart resolver
      if (isModels) {
        targetUrl = normalizedBase.includes('/v1') ? `${normalizedBase}/models` : `${normalizedBase}/v1/models`;
      } else if (isChatCompletions) {
        targetUrl = normalizedBase.includes('/chat/completions') 
          ? normalizedBase 
          : normalizedBase.includes('/v1') 
            ? `${normalizedBase}/chat/completions` 
            : `${normalizedBase}/v1/chat/completions`;
      } else if (isCompletions) {
        targetUrl = normalizedBase.includes('/completions') 
          ? normalizedBase 
          : normalizedBase.includes('/v1') 
            ? `${normalizedBase}/completions` 
            : `${normalizedBase}/v1/completions`;
      } else {
        // Fallback catch
        targetUrl = `${normalizedBase}${requestedPath}`;
      }
    }

    addLog('info', `[代理路由] 发送请求到上游: ${targetUrl}`, `模型: ${requestBody.model || 'N/A'}`);

    // Execute Proxy Request
    const upstreamResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: targetHeaders,
      body: JSON.stringify(requestBody)
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      addLog('error', `上游服务器返回错误 [代码: ${upstreamResponse.status}]`, errorText);
      state.activeConnections--;
      return res.status(upstreamResponse.status).send(errorText);
    }

    // Support streaming
    const isStreamRequested = requestBody.stream === true;
    if (isStreamRequested) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = upstreamResponse.body?.getReader();
      if (!reader) {
        state.activeConnections--;
        return res.status(500).json({ error: 'Failed to initialize upstream streaming body' });
      }

      const decoder = new TextDecoder();
      let streamBuffer = '';

      // Handle translation on the stream if client expects OpenAI but upstream is Anthropic!
      const mustTranslateStream = (provider.protocol === 'anthropic_messages' && isChatCompletions);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunkText = decoder.decode(value, { stream: true });
          
          if (!mustTranslateStream) {
            // Standard direct pass-through stream
            res.write(chunkText);
          } else {
            // Accumulate stream chunks and process line by line
            streamBuffer += chunkText;
            const lines = streamBuffer.split('\n');
            streamBuffer = lines.pop() || ''; // keep trailing unfinished line

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              if (trimmed.startsWith('data:')) {
                const dataRaw = trimmed.slice(5).trim();
                if (dataRaw === '[DONE]') {
                  res.write('data: [DONE]\n\n');
                  continue;
                }

                try {
                  const event = JSON.parse(dataRaw);
                  
                  // Convert Anthropic server events to standard OpenAI chat completion delta chunks
                  if (event.type === 'content_block_delta' && event.delta?.text) {
                    const openAiChunk = {
                      id: `chatcmpl-${Date.now()}`,
                      object: 'chat.completion.chunk',
                      created: Math.floor(Date.now() / 1000),
                      model: requestBody.model,
                      choices: [{
                        index: 0,
                        delta: { content: event.delta.text },
                        finish_reason: null
                      }]
                    };
                    res.write(`data: ${JSON.stringify(openAiChunk)}\n\n`);
                  } else if (event.type === 'message_delta' && event.delta?.stop_reason) {
                    const openAiEndChunk = {
                      id: `chatcmpl-${Date.now()}`,
                      object: 'chat.completion.chunk',
                      created: Math.floor(Date.now() / 1000),
                      model: requestBody.model,
                      choices: [{
                        index: 0,
                        delta: {},
                        finish_reason: event.delta.stop_reason === 'end_turn' ? 'stop' : event.delta.stop_reason
                      }]
                    };
                    res.write(`data: ${JSON.stringify(openAiEndChunk)}\n\n`);
                  }
                } catch (e) {
                  // Fallback if parsing failed
                  // Just skip or keep going
                }
              }
            }
          }
        }

        // Clean up remaining buffer
        if (mustTranslateStream && streamBuffer.trim().startsWith('data:')) {
          // Send final done signal
          res.write('data: [DONE]\n\n');
        } else if (!mustTranslateStream) {
          res.write(streamBuffer);
        }

        res.end();
      } catch (streamErr) {
        addLog('error', '流式数据传输时发生异常', String(streamErr));
      } finally {
        reader.releaseLock();
      }

    } else {
      // Non-streaming response proxying
      const rawResponseText = await upstreamResponse.text();

      // Support protocol translation for standard response
      if (provider.protocol === 'anthropic_messages' && isChatCompletions) {
        try {
          const anthropicJson = JSON.parse(rawResponseText);
          const fullTextContent = anthropicJson.content?.map((c: any) => c.text).join('') || '';

          const openAiResponse = {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: requestBody.model,
            choices: [{
              index: 0,
              message: {
                role: 'assistant',
                content: fullTextContent
              },
              finish_reason: anthropicJson.stop_reason === 'end_turn' ? 'stop' : (anthropicJson.stop_reason || 'stop')
            }],
            usage: {
              prompt_tokens: anthropicJson.usage?.input_tokens || 0,
              completion_tokens: anthropicJson.usage?.output_tokens || 0,
              total_tokens: (anthropicJson.usage?.input_tokens || 0) + (anthropicJson.usage?.output_tokens || 0)
            }
          };

          res.json(openAiResponse);
        } catch (parseErr) {
          res.status(200).send(rawResponseText);
        }
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.status(upstreamResponse.status).send(rawResponseText);
      }
    }

    addLog('success', `[代理路由] 上游请求处理完成`);

  } catch (error) {
    addLog('error', '转发代理请求时发生未知网络错误', String(error));
    res.status(502).json({
      error: {
        message: "Failed to connect to the model provider upstream",
        type: "upstream_error",
        param: null,
        code: "connection_failed",
        details: String(error)
      }
    });
  } finally {
    state.activeConnections--;
  }
});


// --- VITE DEV SERVER OR STATIC PRODUCTION INTEGRATION ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CodexSet] Server successfully started running at http://0.0.0.0:${PORT}`);
    
    // Auto-detect and auto-start Codex on boot
    try {
      addLog('info', '[守护系统] 正在进行 Codex 安装检测与自启动...');
      killExistingCodex();
      const detectedPath = findCodexExecutable();
      addLog('info', `[守护系统] 自动识别并定位 Codex 路径: ${detectedPath}`);
      startCodex(detectedPath);
    } catch (err: any) {
      console.error('Failed to auto-start Codex process on boot:', err);
    }
  });
}

startServer();

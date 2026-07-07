/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BookOpen, Check, Copy, ExternalLink, HelpCircle } from 'lucide-react';

export default function Guide() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const cursorConfig = `{
  "openai.api_key": "dummy-key-for-codex",
  "openai.base_url": "http://localhost:3000/v1"
}`;

  const zedConfig = `{
  "language_models": {
    "openai": {
      "api_url": "http://localhost:3000/v1",
      "available_models": {
        "gpt-4o": { "max_queued_requests": 4 },
        "gpt-4o-mini": { "max_queued_requests": 4 },
        "claude-3-5-sonnet-latest": { "max_queued_requests": 2 }
      }
    }
  }
}`;

  return (
    <div className="space-y-6" id="guide-view">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl" id="guide-card">
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-4 mb-5">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-semibold text-zinc-200">开发工具配置集成指南 (IDE Integration Guide)</h2>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono rounded">1</span>
              工作原理概述
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed pl-7">
              CodexSet 控制台通过在本地 3000 端口启动一个高并发的拦截代理，在您的集成开发环境 (IDE) 或者是脚本客户端发起 AI 请求时，捕获并实时重定向到您当前设置的活动供应商。
              <br />
              <strong className="text-emerald-400">核心亮点：</strong>您无需在客户端拼接任何 <code className="bg-zinc-950 px-1 py-0.5 rounded font-mono text-zinc-300">/v1</code> 路径，控制台会自适应识别客户端的请求结构（比如 GPT 和 Claude 协议的转换），即使您使用 OpenAI 协议的大客户端也可以直连 Claude!
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Cursor Config */}
            <div className="space-y-3 bg-zinc-950 border border-zinc-850 rounded-lg p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300 font-mono tracking-wider">CURSOR CONFIGURATION</span>
                <button
                  onClick={() => copyToClipboard(cursorConfig, 'cursor')}
                  className="text-[11px] bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded flex items-center gap-1 transition-all"
                >
                  {copiedSection === 'cursor' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      复制 JSON
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-zinc-500">
                在 Cursor 设置面板中，禁用默认的 “Cursor Models” ，然后启用 “Override OpenAI API Key” 与 “Override OpenAI Base URL”：
              </p>
              <pre className="bg-zinc-900 border border-zinc-850 text-emerald-400/90 p-3.5 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed">
                {cursorConfig}
              </pre>
              <div className="text-[10px] text-zinc-600 bg-zinc-900/40 p-2 rounded">
                💡 提示：API Key 可以填入任意占位符，控制台会自动注入您在后台配置的对应供应商密钥，或者直接在请求头进行多账户透传。
              </div>
            </div>

            {/* Zed Config */}
            <div className="space-y-3 bg-zinc-950 border border-zinc-850 rounded-lg p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300 font-mono tracking-wider">ZED CONFIGURATION (settings.json)</span>
                <button
                  onClick={() => copyToClipboard(zedConfig, 'zed')}
                  className="text-[11px] bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded flex items-center gap-1 transition-all"
                >
                  {copiedSection === 'zed' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      复制 JSON
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-zinc-500">
                打开 Zed 编辑器，按下快捷键 <kbd className="bg-zinc-900 text-zinc-400 px-1 py-0.5 rounded font-mono text-[10px]">ctrl+,</kbd> (Mac 下为 <kbd className="bg-zinc-900 text-zinc-400 px-1 py-0.5 rounded font-mono text-[10px]">cmd+,</kbd>) 打开配置，加入以下内容：
              </p>
              <pre className="bg-zinc-900 border border-zinc-850 text-emerald-400/90 p-3.5 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed">
                {zedConfig}
              </pre>
              <div className="text-[10px] text-zinc-600 bg-zinc-900/40 p-2 rounded">
                💡 提示：Zed 将通过本地 CodexSet 代理发送请求，使您能够无缝使用中转后的 GPT 与 Claude。
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-5 space-y-2">
            <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              常见问题解答
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-1">
              <div className="bg-zinc-950/40 border border-zinc-850 rounded-lg p-4 space-y-1">
                <h4 className="text-xs font-semibold text-zinc-200">Q: 需要自己手动补全 /v1 路径吗？</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  A: 不需要。控制台有强大的路径自动重写机制。不管您的 IDE 客户端发送的是 <code className="bg-zinc-900 px-1 rounded text-zinc-400">/chat/completions</code> 还是 <code className="bg-zinc-900 px-1 rounded text-zinc-400">/v1/chat/completions</code>，控制台都会自适应将其标准化并正确代理。
                </p>
              </div>

              <div className="bg-zinc-950/40 border border-zinc-850 rounded-lg p-4 space-y-1">
                <h4 className="text-xs font-semibold text-zinc-200">Q: 客户端只支持 GPT，能用这里的 Claude 吗？</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  A: 可以。当您把活动供应商切换到 Claude (Anthropic 协议) 时，控制台的代理网关会将客户端发出的 GPT 数据结构无缝翻译成 Anthropic 结构，并将其结果包装回 GPT 格式返回给 IDE，包括流式 SSE 部分。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

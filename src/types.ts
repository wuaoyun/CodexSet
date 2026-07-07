/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ModelConfig {
  name: string;
  contextWindow: string;
}

export type ProviderProtocol = 'chat_completions' | 'responses_api' | 'anthropic_messages' | 'gemini';

export interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  key: string;
  protocol: ProviderProtocol;
  defaultModel: string;
  models: ModelConfig[];
  userAgent?: string;
  customHeaders?: Array<{ key: string; value: string }>;
  isPreset?: boolean;
}

export interface Settings {
  enableSwitching: boolean;
  activeProviderId: string | null;
  codexStartupCommand: string;
  codexStatus: 'running' | 'stopped' | 'restarting';
  openaiEnvDetected: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'request';
  message: string;
  details?: string;
}

export interface SystemStats {
  uptime: string;
  requestCount: number;
  activeConnections: number;
  memoryUsage: string;
}

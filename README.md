# CodexSet - 核心代理与供应商配置管理控制台

CodexSet 是一个功能强大的全栈本地拦截代理与供应商配置管理终端（替代 Codex++ / Codex 的核心功能）。它支持多模型配置一键切换、完全清除劫持路由、一键重启后端代理、自适应 API 路由兼容（无需手动添加 `/v1`，同时兼容 Claude 和 GPT 协议并支持协议自动互转），并具备本地 JSON 文件的持久化存储，以确保高并发、非阻塞的本地流式交互体验。

---

## 🚀 核心功能亮点

1. **自适应 API 代理网关**：拦截客户端发往 `localhost:3000` 的 `/v1/chat/completions`、`/v1/messages`、`/v1/models` 等请求，自适应处理协议翻译。
2. **GPT / Claude 互转**：客户端即便只支持 OpenAI 的 Chat Completions 协议，通过切换到 Anthropic (Claude) 活动供应商，控制台也会在底层进行流式翻译与分发，使得 Cursor/Zed 等工具无缝支持 Claude 中转。
3. **极速连通性测试**：控制台内置了 SSE 级别的流式连通性测试，无需打开 IDE 即可现场验证 API Key 及网络状况。
4. **一键安全重启**：断开现有流式连接、重新载入供应商配置、秒级刷新并重新绑定拦截端口。
5. **本地持久化保存**：所有新增、修改的供应商、API Key、以及切换状态，均会实时、持久化地写入 `data/config.json`，重启不丢失。

---

## 🛠️ 技术栈与依赖

* **前端**：React 19, TypeScript, Tailwind CSS, Lucide Icons, Fetch API (支持 Server-Sent Events 流式解码)。
* **后端**：Express (Node.js), TypeScript (运行时由 `tsx` 驱动), 具有高并发连接和轻量代理的能力。
* **构建包管理**：Vite 6, Esbuild (用于后端单文件 Bundle 打包)。

---

## 📂 项目结构概览

```bash
├── data/                    # 本地数据持久化目录
│   └── config.json          # 所有的供应商、切换状态、秘钥持久化保存
├── src/
│   ├── components/          # 前端核心业务视图 (Overview, ProviderSettings, SessionLogs, Guide)
│   ├── types.ts             # 强类型声明定义 (Provider, Settings, LogEntry 等)
│   ├── App.tsx              # 单页主程序入口
│   └── main.tsx             
├── server.ts                # Express 后端核心及 API 代理转发与协议转换引擎
├── package.json             # 依赖声明与打包构建脚本
├── vite.config.ts           # 编译与热更新配置文件
└── README.md                # 运行与打包部署文档
```

---

## 💻 怎么运行 (开发环境)

### 1. 安装项目依赖

在项目根目录下，执行以下命令安装所有依赖包：

```bash
npm install
```

### 2. 启动开发服务器

执行以下命令，同时启动前端 Vite 中间件和后端 Express 拦截网关：

```bash
npm run dev
```

* 默认启动后将监听 **`http://localhost:3000`** 端口。
* 您可以直接在浏览器中打开该地址进入管理控制台。
* 开发工具 (IDE) 此时可以直接将 API Base URL 指向 `http://localhost:3000/v1` 进行请求。

---

## 📦 怎么打包 (生产打包与单文件发布)

为了让打包后的代码体积最小、并发启动最快、且脱离对 TypeScript 开发工具的依赖，我们配置了**前后端分离打包 & 后端单文件 bundle** 的机制：

### 1. 执行编译打包

在项目根目录下执行以下命令：

```bash
npm run build
```

该命令会依次执行：
1. **`vite build`**：将前端 React 代码混淆、打包，生成高性能静态资源文件存放在 `dist/` 目录中。
2. **`esbuild server.ts ...`**：通过 Esbuild 编译器，将后端的 TypeScript 核心 `server.ts` 及其引用的本地依赖文件，整体打包并转换为一个高效率、高兼容性的 CJS 生产环境单文件 **`dist/server.cjs`**。

### 2. 启动生产包服务

打包完成后，您可以彻底摆脱任何本地 TypeScript 运行时（如 `tsx` 或 `ts-node`），直接使用 Node.js 生产环境引擎启动：

```bash
npm run start
```

或者使用守护工具（如 PM2）进行后台驻留：

```bash
pm2 start dist/server.cjs --name "codexset-server"
```

---

## 🐳 Docker 容器化打包 (可选)

如果您需要将 CodexSet 打包为 Docker 镜像以部署在私有云或软路由等环境中，可以使用如下 `Dockerfile` 快速构建：

```dockerfile
# 1. 编译阶段
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2. 运行阶段
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["npm", "run", "start"]
```

使用以下命令进行构建与启动：

```bash
docker build -t codexset .
docker run -d -p 3000:3000 -v $(pwd)/data:/app/data --name codexset-service codexset
```

> **提示**：通过挂载 `-v /local/path:/app/data` 可以确保容器在更新时，您的供应商秘钥和配置文件不丢失。

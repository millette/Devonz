<div align="center">

<img width="236" height="79" alt="devonz" src="https://github.com/user-attachments/assets/30c464d9-39a9-4c0d-85f8-64473cfa774c" />

**AI-powered full-stack development agent — describe what you want, watch it build.**

[![Docker Build](https://img.shields.io/github/actions/workflow/status/zebbern/Devonz/ci.yml?branch=main&label=Docker%20Build&logo=docker)](https://github.com/zebbern/Devonz/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/Node-18.18%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Features](#features) · [Quick Start](#quick-start) · [Configuration](#configuration) · [Docker](#docker) · [Contributing](#contributing)

![Devonz Screenshot](https://github.com/user-attachments/assets/e4c3067d-2539-4b5e-abab-d129d90b51dc)

</div>

---

## What is Devonz?

Devonz is a **local-first, AI-powered coding environment** that runs on your machine. Describe what you want to build in natural language, and an AI agent generates full-stack applications in a browser-based IDE with an integrated editor, terminal, and live preview — all powered by your local Node.js runtime.

This is a **local development tool**, not a hosted web service. You run it on your own hardware, bring your own API keys, and keep full control of your code.

---

## Features

- **22 LLM providers** — OpenAI, Anthropic, Google, Groq, DeepSeek, Ollama, LM Studio, and [more](docs/LLM-PROVIDERS.md). Swap models mid-conversation.
- **Full dev environment** — in-browser code editor (CodeMirror), integrated terminal (xterm.js), and real-time application preview.
- **Auto-fix** — terminal error detection catches failures and patches them automatically.
- **MCP tool integration** — extend the agent with [Model Context Protocol](https://modelcontextprotocol.io/) servers for specialized workflows.
- **Extended thinking** — AI reasoning visualization for Anthropic Claude and Google Gemini.
- **Image context** — attach screenshots or design files to prompts for visual understanding.
- **Deploy from the UI** — push to GitHub, GitLab, Netlify, or Vercel directly.
- **Design Palette** — pick custom color themes that get injected into generated apps.
- **3D support** — generate React Three Fiber apps with automatic version pinning.
- **Template gallery** — start from popular frameworks and boilerplates, then customize with AI.
- **Security hardened** — all API routes wrapped with input validation, rate limiting, and URL allowlisting.

---

## Quick Start

### Prerequisites

- **Node.js** 18.18 or later
- **pnpm** 9.x (`corepack enable && corepack prepare pnpm@9.14.4 --activate`)

### From Source

```bash
git clone https://github.com/zebbern/Devonz.git
cd Devonz
cp .env.example .env.local   # add your API keys
pnpm install
pnpm run dev
```

Open [http://localhost:5173](http://localhost:5173).

> The first load can take up to two minutes while dependencies compile.

### With Docker

No local Node.js required — just Docker.

```bash
git clone https://github.com/zebbern/Devonz.git
cd Devonz
cp .env.example .env.local   # add your API keys
docker compose up -d
```

Open [http://localhost:5173](http://localhost:5173).

---

## Configuration

### Environment Variables

Copy the example file and fill in your API keys:

```bash
cp .env.example .env.local
```

Or run the interactive setup wizard, which creates `.env.local` and prompts for keys with hidden input:

```bash
pnpm run setup
```

At minimum, add one AI provider key:

```bash
# Pick any provider(s) you have keys for
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=AI...
```

You can also configure providers at runtime via **Settings → Providers** in the UI.

See [`.env.example`](.env.example) for the full list of supported variables, including deployment tokens, local provider URLs, and encryption settings.

### Supported LLM Providers

| Provider | Env Variable | Notes |
|----------|-------------|-------|
| OpenAI | `OPENAI_API_KEY` | GPT-4o, o1 series |
| Anthropic | `ANTHROPIC_API_KEY` | Claude 3.5 / 4 |
| Google Gemini | `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini models |
| DeepSeek | `DEEPSEEK_API_KEY` | DeepSeek Chat, Coder |
| Groq | `GROQ_API_KEY` | Fast inference |
| Mistral | `MISTRAL_API_KEY` | Mistral Large / Small |
| Cohere | `COHERE_API_KEY` | Command R+ |
| X.AI | `XAI_API_KEY` | Grok models |
| Perplexity | `PERPLEXITY_API_KEY` | Search-augmented |
| Together | `TOGETHER_API_KEY` | Open-source models |
| Fireworks | `FIREWORKS_API_KEY` | Fast inference |
| Cerebras | `CEREBRAS_API_KEY` | Fast inference |
| HuggingFace | `HuggingFace_API_KEY` | Inference API |
| OpenRouter | `OPEN_ROUTER_API_KEY` | Multi-provider routing |
| GitHub Models | `GITHUB_API_KEY` | GitHub-hosted models |
| Moonshot | `MOONSHOT_API_KEY` | Kimi models |
| Hyperbolic | `HYPERBOLIC_API_KEY` | Hyperbolic inference |
| Z.ai | `ZAI_API_KEY` | GLM coding models |
| Amazon Bedrock | `AWS_BEDROCK_CONFIG` | AWS-hosted models (JSON) |
| Ollama | `OLLAMA_API_BASE_URL` | Local models, no key needed |
| LM Studio | `LMSTUDIO_API_BASE_URL` | Local models, no key needed |
| OpenAI-Like | `OPENAI_LIKE_API_BASE_URL` | Any compatible API |

For details on adding a new provider, see [docs/LLM-PROVIDERS.md](docs/LLM-PROVIDERS.md).

---

## Docker

All Docker commands are available as pnpm scripts:

```bash
pnpm docker:build          # Build image locally
pnpm docker:run            # Run standalone container
pnpm docker:up             # Start via Docker Compose
pnpm docker:down           # Stop services
pnpm docker:dev            # Dev mode with hot reload
pnpm docker:update         # Pull latest image + restart
```

The [`docker-compose.yml`](docker-compose.yml) includes three profiles:

| Profile | Command | Description |
|---------|---------|-------------|
| *(default)* | `docker compose up -d` | Production — pulls from GHCR |
| `dev` | `docker compose --profile dev up` | Development — bind-mount with hot reload |
| `auto-update` | `docker compose --profile auto-update up -d` | Adds Watchtower to poll GHCR every 5 minutes |

---

## Development

### Scripts

```bash
pnpm run dev               # Start dev server (http://localhost:5173)
pnpm run build             # Production build
pnpm run start             # Run production build
pnpm run preview           # Build + preview locally

pnpm test                  # Run test suite
pnpm test:watch            # Tests in watch mode
pnpm run typecheck         # TypeScript type check
pnpm run lint              # ESLint check
pnpm run lint:fix          # Auto-fix lint issues

pnpm run clean             # Clean build artifacts
pnpm run update            # Pull latest + install + rebuild
```

### Updating

**Git clone:**

```bash
pnpm run update                    # pull, install, rebuild
pnpm run update -- --skip-build    # pull + install only
```

**Docker:**

```bash
pnpm docker:update                 # pull latest image, restart
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Remix + React Router v7 |
| Build | Vite 5 |
| Language | TypeScript (strict) |
| Styling | UnoCSS + SCSS + Radix UI |
| State | Nanostores |
| AI | Vercel AI SDK (22 providers) |
| Editor | CodeMirror 6 |
| Terminal | xterm.js |
| Runtime | Local Node.js |
| Testing | Vitest + Testing Library |

### Project Structure

<details>
<summary>Expand file tree</summary>

```
devonz/
├── app/
│   ├── components/         # React components (10 groups)
│   │   ├── @settings/      # Settings panel (14 tabs)
│   │   ├── chat/           # Chat interface
│   │   ├── deploy/         # Deployment integrations
│   │   ├── editor/         # Code editor (CodeMirror)
│   │   ├── git/            # Git integration
│   │   ├── header/         # App header
│   │   ├── sidebar/        # Sidebar navigation
│   │   ├── templates/      # Template gallery
│   │   ├── ui/             # 40+ shared UI components
│   │   └── workbench/      # Development workbench
│   ├── lib/
│   │   ├── .server/        # Server-only code (LLM streaming)
│   │   ├── agent/          # Agent prompts + orchestration
│   │   ├── common/         # Prompt library + shared prompts
│   │   ├── hooks/          # Custom React hooks
│   │   ├── modules/        # Feature modules (22 LLM providers)
│   │   ├── persistence/    # IndexedDB, localStorage, autoBackup
│   │   ├── runtime/        # Action runner, message parser, local runtime
│   │   ├── services/       # API services
│   │   ├── stores/         # Nanostores
│   │   └── utils/          # Service-level utilities
│   ├── routes/             # Remix routes (pages + API endpoints)
│   ├── styles/             # Global styles (SCSS + CSS)
│   └── types/              # TypeScript type definitions
├── docs/                   # Extended documentation
└── scripts/                # Build & update scripts
```

</details>

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Run checks: `pnpm lint:fix && pnpm test`
4. Commit with a [conventional message](https://www.conventionalcommits.org/): `git commit -m 'feat: add my feature'`
5. Push and open a Pull Request

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for detailed guidelines including code style, testing patterns, and API route conventions.

---

## Acknowledgments

- [bolt.diy](https://github.com/stackblitz-labs/bolt.diy) — original project foundation (originally StackBlitz bolt.new). Devonz replaces the WebContainer runtime with a local Node.js runtime.
- [Vercel AI SDK](https://sdk.vercel.ai/) — LLM integration layer

---

<div align="center">
  <strong>Build anything with AI. Just describe what you want.</strong>
  <br><br>
  <a href="https://github.com/zebbern/Devonz">GitHub</a> ·
  <a href="https://github.com/zebbern/Devonz/issues">Issues</a> ·
  <a href="docs/">Documentation</a>
</div>
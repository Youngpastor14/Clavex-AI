# Clavex — AI Brand Diagnostic

> Free AI-powered brand diagnostic tool by [Fortex Forge](https://fortexforge.com). Talk to Clavex and discover in minutes what your brand actually needs.

**Clavex** is the diagnostic tool. **Fortex Forge** is the creative tech agency that built it.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Express.js (Node.js) |
| AI | Groq API (Llama 3.3 70B) |
| Analytics | Async file-based JSON logging |
| Security | Helmet, CORS, HTTPS redirect, rate limiting, input validation |

## Project Structure

```
clavex/
├── index.html              # Entry HTML with SEO meta tags
├── vite.config.js           # Vite config with API proxy
├── package.json
├── .env                     # API keys (not committed)
├── .env.example             # Template for .env
├── public/
│   └── favicon.svg          # Clavex favicon
├── src/
│   ├── main.jsx             # React entry point
│   └── App.jsx              # Full application (landing, chat, results)
├── server/
│   ├── index.js             # Express API server + Groq proxy
│   ├── analytics.js         # Async file-based analytics system
│   ├── input-guard.js       # Input validation & prompt injection protection
│   └── rate-limiter.js      # In-memory rate limiter
└── data/
    └── analytics.json       # Analytics log (auto-created, gitignored)
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and add your Groq API key:

```bash
# Get your free key at: https://console.groq.com/
GROQ_API_KEY=your_groq_api_key_here
ANALYTICS_PASSWORD=your_admin_password_here
PORT=3001
```

### 3. Run in development

```bash
npm run dev
```

This starts **both** the Vite frontend (port 3000) and the Express backend (port 3001) concurrently. The Vite dev server proxies `/api/*` requests to the backend automatically.

Open **http://localhost:3000** in your browser.

### 4. Build for production

```bash
npm run build
npm start
```

This builds the React app into `dist/` and serves it via the Express server on port 3001 (or `PORT` from .env).

## Features

- **AI Brand Diagnostic** — Conversational AI that diagnoses which service your brand needs
- **Streaming Responses** — Real-time token streaming via SSE
- **Session Persistence** — Conversations survive page refresh (sessionStorage, 30-min expiry)
- **Analytics Dashboard** — View stats at `/api/analytics/stats?password=YOUR_PASSWORD`
- **Character Counter** — 800-character limit with visual feedback
- **Export Results** — Copy diagnosis to clipboard or download as a text file
- **FAQ Panel** — Searchable quick answers
- **Rate Limiting** — 15 messages per 5-minute window per IP
- **Input Validation** — Prompt injection protection + message sanitization
- **HTTPS Enforcement** — Automatic redirect in production
- **Security** — API key never reaches the browser, Helmet headers, CORS

## Security

- The Groq API key is stored server-side only (`.env`) and **never** sent to the browser
- System prompt and guardrail prompt are server-side only
- Input validation blocks prompt injection attempts
- Rate limiting prevents abuse (15 req / 5 min per IP)
- Helmet sets secure HTTP headers
- HTTPS redirect enforced in production via `x-forwarded-proto`

## Scripts

| Command | Description |
|---------|------------|
| `npm run dev` | Start frontend + backend concurrently |
| `npm run dev:client` | Start Vite dev server only |
| `npm run dev:server` | Start Express API server only |
| `npm run build` | Build production frontend |
| `npm start` | Serve production build via Express |

## License

Built by [Fortex Forge](https://fortexforge.com) — Forging Absolute Clarity.

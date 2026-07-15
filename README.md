# AI Receptionist — Backend

> **Production-ready Fastify + TypeScript backend** for an AI-powered voice receptionist that handles inbound calls, schedules appointments, and logs interactions — running 24/7 on Railway.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Folder Structure](#folder-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Routes](#routes)
- [Planned Integrations](#planned-integrations)
- [Deployment (Railway)](#deployment-railway)
- [Code Quality](#code-quality)

---

## Overview

The AI Receptionist backend is a stateless API server that will act as the brain for an AI-powered phone receptionist. It:

1. Receives inbound voice calls via **Twilio Voice**
2. Streams audio in real-time via **Twilio Media Streams** (WebSocket)
3. Transcribes speech using **WhisperFlow**
4. Generates intelligent responses using **Google Gemini**
5. Books/manages appointments on **Google Calendar**
6. Persists contacts and call logs to **Supabase**
7. Caches session state in **Redis**
8. Triggers downstream automations via **n8n**

---

## Architecture

```
                ┌─────────────────────────────────────┐
                │          TWILIO VOICE / PSTN        │
                │    (Inbound call → TwiML webhook)   │
                └───────────────┬─────────────────────┘
                                │ HTTPS webhook
                ┌───────────────▼─────────────────────┐
                │         FASTIFY SERVER              │
                │   (Railway — Node.js, Port 3000)    │
                │                                     │
                │  ┌─────────┐  ┌──────────────────┐ │
                │  │ Routes  │  │   Middleware      │ │
                │  │ /health │  │ - Request logger  │ │
                │  │ /twilio │  │ - Error handler   │ │
                │  │ /ws     │  │ - Rate limiter    │ │
                │  └────┬────┘  │ - Helmet / CORS   │ │
                │       │       └──────────────────┘ │
                │  ┌────▼──────────────────────────┐ │
                │  │         Services Layer         │ │
                │  │  ReceptionistService           │ │
                │  │  TranscriptionService          │ │
                │  │  SynthesisService              │ │
                │  └────┬──────────────────────────┘ │
                └───────┼─────────────────────────────┘
                        │
          ┌─────────────┼──────────────────────┐
          │             │                      │
  ┌───────▼───┐  ┌──────▼──────┐  ┌───────────▼───┐
  │  Gemini   │  │ Google Cal  │  │   Supabase    │
  │  (AI LLM) │  │  (Calendar) │  │  (Database)   │
  └───────────┘  └─────────────┘  └───────────────┘
          │
  ┌───────▼───┐  ┌─────────────┐
  │   Redis   │  │    n8n      │
  │  (Cache)  │  │(Automation) │
  └───────────┘  └─────────────┘
```

### Request Flow (Voice Call)

```
Caller dials number
  → Twilio sends POST /api/v1/twilio/voice
    → Server returns TwiML (connect to Media Stream)
      → Twilio opens WebSocket to /ws/media-stream
        → Audio chunks stream in real time
          → WhisperFlow transcribes audio
            → Gemini generates response
              → TTS converts response to audio
                → Audio streamed back to caller
                  → (If appointment intent) → Google Calendar booked
                    → Contact saved to Supabase
                      → n8n notified for follow-up
```

---

## Folder Structure

```
ai-receptionist/
├── src/
│   ├── server.ts          # Entry point — bootstraps and starts Fastify
│   ├── app.ts             # App factory — registers plugins, middleware, routes
│   │
│   ├── config/
│   │   ├── env.ts         # Environment variable registry (validated at startup)
│   │   └── constants.ts   # App-wide magic values (status codes, timeouts, etc.)
│   │
│   ├── routes/
│   │   └── health.ts      # GET /health, GET /health/ready (liveness + readiness)
│   │   # future: twilio.ts, calendar.ts, ai.ts, crm.ts
│   │
│   ├── api/               # Route handler logic (controllers)
│   │   # future: twilioHandler.ts, calendarHandler.ts, aiHandler.ts
│   │
│   ├── services/          # Business orchestration layer
│   │   # future: receptionistService.ts, transcriptionService.ts, cacheService.ts
│   │
│   ├── ai/                # Google Gemini integration
│   │   # future: geminiClient.ts, conversationManager.ts, promptBuilder.ts
│   │
│   ├── twilio/            # Twilio Voice + Media Streams
│   │   # future: webhookHandler.ts, mediaStreamHandler.ts, twimlBuilder.ts
│   │
│   ├── calendar/          # Google Calendar integration
│   │   # future: calendarClient.ts, availabilityChecker.ts, appointmentService.ts
│   │
│   ├── crm/               # CRM / contact management
│   │   # future: contactService.ts, callLogService.ts, leadService.ts
│   │
│   ├── websocket/         # WebSocket server for Twilio Media Streams
│   │   # future: mediaStreamServer.ts, audioPipeline.ts, sessionManager.ts
│   │
│   ├── database/          # Supabase client + query helpers
│   │   # future: supabaseClient.ts, schema types
│   │
│   ├── middleware/
│   │   ├── errorHandler.ts  # Global Fastify error handler
│   │   └── requestLogger.ts # Structured request logging hook
│   │
│   ├── utils/
│   │   ├── logger.ts        # Pino logger (pretty dev / JSON prod)
│   │   └── helpers.ts       # sleep, utcNow, safeJsonParse, stripEmpty
│   │
│   └── types/
│       ├── api.ts           # ApiSuccess, ApiError, ApiMeta
│       ├── domain.ts        # CallSession, Transcript, Appointment, Contact, etc.
│       └── index.ts         # Barrel export
│
├── .env.example           # All env variables documented — safe to commit
├── .eslintrc.cjs          # ESLint (TypeScript-aware + Prettier compat)
├── .prettierrc            # Prettier formatting rules
├── .gitignore
├── package.json
├── tsconfig.json          # Base TypeScript config (strict mode)
├── tsconfig.build.json    # Build-only config (excludes tests)
├── railway.toml           # Railway deployment config
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** `>= 20`
- **npm** `>= 10`

### Install

```bash
cd ai-receptionist
npm install
```

### Configure environment

```bash
cp .env.example .env
# Edit .env and fill in the values you have so far
```

### Run in development

```bash
npm run dev
```

The server starts on `http://localhost:3000`.

### Build for production

```bash
npm run build
npm start
```

---

## Environment Variables

All variables are documented in [`.env.example`](.env.example).

| Variable | Required | Description |
|---|---|---|
| `PORT` | No (default: 3000) | Server port |
| `HOST` | No (default: 0.0.0.0) | Bind host |
| `NODE_ENV` | No (default: development) | `development` / `production` |
| `LOG_LEVEL` | No (default: info) | Pino log level |
| `CORS_ORIGIN` | No (default: *) | Allowed CORS origins |
| `RATE_LIMIT_MAX` | No (default: 100) | Requests per window |
| `TWILIO_ACCOUNT_SID` | When Twilio enabled | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | When Twilio enabled | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | When Twilio enabled | Purchased Twilio number |
| `TWILIO_MEDIA_STREAM_URL` | When Twilio enabled | WSS URL for media streams |
| `WHISPERFLOW_API_KEY` | When STT enabled | WhisperFlow API key |
| `WHISPERFLOW_API_URL` | When STT enabled | WhisperFlow endpoint |
| `GEMINI_API_KEY` | When AI enabled | Google Gemini API key |
| `GEMINI_MODEL` | No (default: gemini-1.5-pro) | Gemini model name |
| `GOOGLE_CLIENT_ID` | When Calendar enabled | OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | When Calendar enabled | OAuth2 client secret |
| `GOOGLE_REDIRECT_URI` | When Calendar enabled | OAuth2 redirect URI |
| `GOOGLE_CALENDAR_ID` | When Calendar enabled | Target calendar ID |
| `SUPABASE_URL` | When DB enabled | Supabase project URL |
| `SUPABASE_ANON_KEY` | When DB enabled | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | When DB enabled | Supabase service role key |
| `REDIS_URL` | When cache enabled | Redis connection string |
| `N8N_WEBHOOK_BASE_URL` | When n8n enabled | n8n webhook base URL |
| `N8N_API_KEY` | When n8n enabled | n8n API key |

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot-reload via `tsx watch` |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run compiled production build |
| `npm run lint` | Run ESLint checks |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format all `src/**/*.ts` with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm run type-check` | TypeScript check without emitting |
| `npm run clean` | Remove `dist/` directory |

---

## Routes

### Currently Active

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness probe — returns server uptime, env, version |
| `GET` | `/health/ready` | Readiness probe — checks all integration configs |
| `GET` | `/api/chat/test` | Verifies the live AI (OpenRouter / Gemini) connection |
| `POST` | `/api/chat` | Send a message to the AI brain (supports history and system prompt overrides) |
| `POST` | `/api/bookings` | Create a new appointment booking |
| `GET` | `/api/bookings/:id` | Retrieve booking details by ID |
| `PATCH` | `/api/bookings/:id` | Reschedule an existing booking (sets new time) |
| `DELETE` | `/api/bookings/:id` | Cancel an existing booking |
| `POST` | `/api/v1/twilio/voice` | Twilio voice webhook returning valid TwiML greeting |
| `POST` | `/api/v1/twilio/process` | Twilio voice webhook processing caller speech turns |
| `GET` | `/api/appointments` | List all upcoming dental appointments |

### Testing the AI Endpoint

To verify the live AI integration, run the following commands:

#### 1. Connection Test (GET)
Returns a fixed verification message confirming communication with OpenRouter:
```bash
# Using curl:
curl http://localhost:3000/api/chat/test

# Using PowerShell:
Invoke-RestMethod http://localhost:3000/api/chat/test | ConvertTo-Json
```

#### 2. AI Receptionist Chat (POST)
Send a message using an optional `conversationId` to start or continue a session. The system injects Sparkle Family Dental clinic knowledge and maintains memory:

```bash
# Start a new session (omitting conversationId)
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hi, what services do you offer?"}'

# Continue the conversation using the returned conversationId
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"conversationId": "YOUR-SESSION-ID", "message": "How much does professional teeth whitening cost?"}'
```

##### Example Response (Teeth Whitening flow)
```json
{
  "success": true,
  "data": {
    "reply": "Our professional teeth whitening is $350. It's an in-office laser whitening session that brightens your teeth up to 8 shades in one hour. Would you like me to help you schedule an appointment for that?",
    "conversationId": "e4c7b525-f609-4683-8b7d-b6015c8cc962",
    "model": "google/gemini-2.5-flash",
    "usage": {
      "promptTokens": 1015,
      "candidateTokens": 46,
      "totalTokens": 1061
    },
    "finishReason": "stop"
  },
  "meta": {
    "reqId": "req-3",
    "timestamp": "2026-07-14T17:49:50.706Z"
  }
}
```

#### 3. Twilio Voice Webhook (POST)
To simulate an inbound call from Twilio, trigger a POST request with urlencoded form variables:

```bash
# Using native curl:
curl -X POST http://localhost:3000/api/v1/twilio/voice \
  -d "CallSid=CA1234567890abcdef1234567890abcdef&From=%2B13035550199&To=%2B13035550100&Direction=inbound&CallStatus=ringing"

# Using PowerShell:
$body = @{ CallSid = "CA1234567890abcdef1234567890abcdef"; From = "+13035550199"; To = "+13035550100"; Direction = "inbound"; CallStatus = "ringing" }
Invoke-RestMethod -Uri http://localhost:3000/api/v1/twilio/voice -Method POST -ContentType "application/x-www-form-urlencoded" -Body $body
```

##### Example Response (XML TwiML)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Neural-Olivia" language="en-US">Hello. Thank you for calling. I am your AI receptionist. How may I help you today?</Say>
</Response>
```


### Planned

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/twilio/status` | Twilio call status callback |
| `GET` | `/api/v1/crm/contacts/:phone` | Lookup contact by phone |
| `POST` | `/api/v1/crm/calls` | Log a completed call |
| `WS` | `/ws/media-stream` | Twilio Media Stream WebSocket |

---

## Planned Integrations

| Service | Purpose | Status |
|---|---|---|
| **Google Gemini (OpenRouter)** | AI conversation generation & tool execution | 🟢 Active |
| **Google Calendar** | Real-time booking search and creation | 🟢 Active |
| **Supabase** | Client, schema migrations, and booking logs | 🟢 Active |
| **Twilio Voice** | Receive inbound phone calls and play greeting | 🟢 Active |
| **Twilio Media Streams** | Real-time audio streaming over WebSocket | 🔜 Next |
| **WhisperFlow** | Speech-to-text transcription | 🔜 Planned |
| **Redis** | Session cache, rate-limit state | 🔜 Planned |
| **n8n** | Post-call automation workflows | 🔜 Planned |

---

## Deployment (Railway)

This project is configured for one-click deployment to Railway via `railway.toml`.

### How it works

1. **Build**: `npm ci && npm run build` — installs deps, compiles TypeScript
2. **Start**: `node dist/server.js`
3. **Health check**: Railway pings `GET /health` every 30s
4. **Auto-restart**: On failure, Railway retries up to 3 times

### Required Railway environment variables

Set these in your Railway service's **Variables** panel — they are **not committed to source control**:

- All variables from `.env.example` that are marked "required" for each active integration.

### Deploy

```bash
# Install Railway CLI
npm i -g @railway/cli

# Link to your project
railway link

# Deploy
railway up
```

---

## Code Quality

| Tool | Purpose | Config |
|---|---|---|
| **TypeScript** (strict) | Type safety | `tsconfig.json` |
| **ESLint** | Linting | `.eslintrc.cjs` |
| **Prettier** | Formatting | `.prettierrc` |
| **pino** | Structured logging | `src/utils/logger.ts` |

### Conventions

- **All env vars** flow through `src/config/env.ts` — never `process.env` directly in business logic.
- **All domain types** live in `src/types/` — shared across modules.
- **All error responses** follow the `ApiError` envelope from `src/types/api.ts`.
- Services are stateless where possible — state lives in Redis or Supabase.
- Each integration module is self-contained under its own folder.

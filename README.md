<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" />
  <img src="https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3ECF8E?logo=supabase" />
  <img src="https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle" />
  <img src="https://img.shields.io/badge/Groq-AI-F55036" />
  <img src="https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss" />
</p>

# 🗨️ Babble

**A unified inbox and AI-powered operations assistant that brings every work conversation into one place — emails, chats, and more — so you can stop context-switching and start shipping.**

---

## 🎯 Goal & Objective

Modern knowledge workers are drowning in fragmented communication. Outlook, Gmail, Slack, WhatsApp — each lives in its own tab, its own notification stream, its own mental context. **Babble** exists to fix that.

Babble is a **single pane of glass** for all your work conversations, supercharged with an **AI co-pilot** that reads, summarizes, and suggests actions so you never miss what matters.

### Core pillars

| Pillar               | What it does                                                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unified Inbox**    | Aggregate messages from Outlook, Gmail, and other providers into one chronological feed grouped by conversation threads.                     |
| **AI Summarization** | One-click inbox digest _and_ per-conversation summaries — sentiment, key points, next steps, and open questions — all powered by Groq's LLM. |
| **Smart Actions**    | AI-suggested actions (reply, schedule, escalate) ranked by priority so you act on the right thing first.                                     |
| **Live Snapshots**   | Real-time AI analysis of what's happening across your inbox right now — trending topics, urgent items, response gaps.                        |
| **Collaboration**    | SSE-powered live collaboration sessions where teammates can share context, notes, and decisions alongside conversations.                     |

---

## 🧩 How Babble Solves Productivity Issues

| Pain Point                                                                     | Babble's Answer                                                                            |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| **Tab overload** — jumping between email clients, chat apps, and project tools | One unified inbox; everything lives at `/chat`                                             |
| **"What did I miss?"** — scanning 50+ unread emails after a meeting            | AI inbox digest gives you a 30-second catch-up with priorities                             |
| **Losing context** — searching three apps to find the thread about a decision  | Per-conversation insights surface the summary, key points, and pending questions instantly |
| **Delayed responses** — important emails buried under newsletters              | AI-suggested actions rank by urgency so critical items float to the top                    |
| **Siloed knowledge** — only one person knows what happened on a thread         | Live collaboration sessions let the team annotate and decide together in real time         |

---

## 🏗️ Tech Stack

| Layer           | Technology                                       |
| --------------- | ------------------------------------------------ |
| Framework       | Next.js 16 (App Router)                          |
| Language        | TypeScript 5                                     |
| UI              | React 19, Tailwind CSS 4, Radix UI, Lucide Icons |
| Auth            | Supabase Auth (Google & Microsoft OAuth)         |
| Database        | PostgreSQL (via Supabase)                        |
| ORM             | Drizzle ORM 0.45                                 |
| AI              | Groq SDK — `llama-3.3-70b-versatile`             |
| Real-time       | Server-Sent Events (SSE)                         |
| Package Manager | pnpm                                             |

---

## 📂 Project Structure

```
client/
├── app/
│   ├── page.tsx                 # Landing page — hero, features, OAuth sign-in
│   ├── layout.tsx               # Root layout — AuthProvider, dark theme, fonts
│   ├── globals.css              # Global styles, scrollbar hiding, Tailwind imports
│   ├── auth/callback/           # OAuth callback — exchanges code, stores provider tokens
│   ├── chat/page.tsx            # Main dashboard — unified inbox, AI panels, collaboration
│   ├── dashboard/page.tsx       # Minimal signed-in placeholder (redirects if unauthed)
│   ├── outlook/page.tsx         # Legacy OAuth testing page for Microsoft/Google sign-in
│   ├── context/AuthContext.tsx   # Global auth state — session, user, provider tokens
│   └── api/
│       ├── inbox/
│       │   ├── ingest/          # Fetches & persists messages from Outlook / Gmail APIs
│       │   ├── conversations/   # Lists conversation threads for an org, filterable by channel
│       │   ├── messages/        # Returns messages for a specific conversation
│       │   ├── analyze/         # AI-powered full inbox digest — summary + suggested actions
│       │   ├── summarize/       # Per-conversation AI summary — sentiment, key points, next steps
│       │   ├── live-snapshot/   # Real-time AI snapshot of current inbox activity
│       │   └── collaborate/     # CRUD + SSE streaming for live collaboration sessions
│       ├── user/
│       │   ├── route.ts         # User profile endpoint
│       │   └── ensure-org/      # Auto-creates default organization on first use
│       ├── generateSummary/     # Standalone summary generation endpoint
│       └── testMiddleware/      # Auth middleware testing endpoint
├── components/
│   ├── sidebar.tsx              # Left nav — channel list, sync button, user info, sign-out
│   ├── conversation-list.tsx    # Scrollable list of conversation threads with previews
│   ├── conversation-view.tsx    # Full conversation thread — messages, reply composer, insights
│   ├── conversation-insights.tsx # Collapsible AI insights panel — summary, sentiment, actions
│   ├── summary-panel.tsx        # Inbox-wide AI summary display
│   ├── suggested-actions.tsx    # AI-suggested action cards ranked by priority
│   ├── live-snapshot.tsx        # Real-time inbox activity snapshot display
│   ├── collaboration-panel.tsx  # Live collaboration session with SSE streaming
│   └── ui/                      # Reusable primitives — button, dialog, input, badge, etc.
├── drizzle/
│   ├── index.ts                 # Database client singleton
│   ├── schema/                  # Table definitions (see Database Schema below)
│   └── migrations/              # SQL migration files (0000–0005)
├── lib/
│   ├── utils.ts                 # Tailwind cn() helper
│   ├── types/inbox.ts           # Shared TypeScript types for inbox, AI, collaboration
│   ├── middleware/               # Auth middleware for protected API routes
│   └── supabase/                # Supabase client helpers (browser + server)
└── utils/
    ├── generate.ts              # AI response generation utilities
    └── parse_until_json.ts      # Streaming JSON parser for partial AI responses
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 9
- A **Supabase** project with Google and/or Microsoft OAuth configured
- A **Groq** API key ([console.groq.com](https://console.groq.com))

### 1 · Clone & install

```bash
git clone https://github.com/your-org/babble.git
cd babble/client
pnpm install
```

### 2 · Configure environment

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your credentials:

| Variable                               | Where to get it                                          |
| -------------------------------------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase Dashboard → Settings → API                      |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same page — `anon` / `public` key                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | Same key (used by middleware & SSE streams)              |
| `DATABASE_URL`                         | Supabase → Settings → Database → Connection string (URI) |
| `GROQ_API_KEY`                         | [console.groq.com](https://console.groq.com) → API Keys  |
| `GROQ_MODEL`                           | _(optional)_ Defaults to `llama-3.3-70b-versatile`       |

### 3 · Set up the database with Drizzle

Babble uses **Drizzle ORM** with PostgreSQL. The schema lives in `drizzle/schema/` and migrations in `drizzle/migrations/`.

```bash
# Generate migrations from the schema (if you've made schema changes)
pnpm drizzle-kit generate

# Push migrations to your database
pnpm drizzle-kit migrate

# Or, for rapid prototyping, push schema directly (skips migration files)
pnpm drizzle-kit push
```

> **Tip:** Drizzle reads `DATABASE_URL` from your `.env` file. If you only have `.env.local`, either copy it or export the variable before running drizzle-kit:
>
> ```bash
> cp .env.local .env
> ```

To visually inspect your database:

```bash
pnpm drizzle-kit studio
```

This opens Drizzle Studio at `https://local.drizzle.studio`.

### 4 · Configure Supabase OAuth

In your Supabase dashboard:

1. **Authentication → Providers → Azure (Microsoft)**
   - Enable the provider
   - Add your Azure AD client ID and secret
   - Set the redirect URL to `http://localhost:3000/auth/callback`

2. **Authentication → Providers → Google**
   - Enable the provider
   - Add your Google OAuth client ID and secret
   - Set the redirect URL to `http://localhost:3000/auth/callback`

3. **Authentication → URL Configuration**
   - Set Site URL to `http://localhost:3000`
   - Add `http://localhost:3000/auth/callback` to Redirect URLs

### 5 · Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll see the landing page. Sign in with Microsoft or Google to hit the unified inbox at `/chat`.

---

## 🗄️ Database Schema

Babble's database has **12 tables** across 6 migration files, managed by Drizzle ORM.

### Enums

| Enum                  | Values                                                           |
| --------------------- | ---------------------------------------------------------------- |
| `provider`            | `google`, `outlook`, `slack`                                     |
| `channel`             | `email`, `sms`, `whatsapp`, `slack`, `web_chat`, `internal_note` |
| `conversation_status` | `open`, `closed`, `snoozed`, `archived`                          |
| `sender_type`         | `customer`, `agent`, `system`, `bot`                             |
| `message_direction`   | `inbound`, `outbound`                                            |
| `task_status`         | `todo`, `in_progress`, `done`, `cancelled`                       |
| `task_priority`       | `low`, `medium`, `high`, `urgent`                                |
| `reminder_status`     | `pending`, `sent`, `dismissed`                                   |
| `summary_type`        | `inbox_digest`, `live_snapshot`, `conversation_summary`          |
| `team_role`           | `admin`, `member`, `viewer`                                      |

### Tables

| Table                    | Purpose                                                            |
| ------------------------ | ------------------------------------------------------------------ |
| `users`                  | User profiles synced from Supabase Auth                            |
| `provider_accounts`      | Linked OAuth provider accounts per user                            |
| `organizations`          | Workspaces / tenant organizations                                  |
| `teams`                  | Team membership with roles                                         |
| `conversations`          | Conversation threads with channel, status, and participants        |
| `messages`               | Individual messages within conversations                           |
| `tasks`                  | AI-generated or manual tasks linked to conversations               |
| `reminders`              | Scheduled reminders for conversations or tasks                     |
| `ai_summaries`           | Stored AI-generated summaries (inbox digest, per-convo, snapshots) |
| `collaboration_sessions` | Live collaboration sessions for team decision-making               |

---

## 📡 API Routes

| Route                                 | Method | Description                                                      |
| ------------------------------------- | ------ | ---------------------------------------------------------------- |
| `/api/inbox/ingest`                   | `POST` | Syncs emails from Microsoft Graph or Gmail API into the database |
| `/api/inbox/conversations`            | `GET`  | Lists conversation threads (filterable by `channel` and `orgId`) |
| `/api/inbox/messages`                 | `GET`  | Fetches messages for a conversation by `conversationId`          |
| `/api/inbox/analyze`                  | `POST` | AI inbox-wide analysis — returns summary + suggested actions     |
| `/api/inbox/summarize`                | `POST` | AI per-conversation summary — sentiment, key points, next steps  |
| `/api/inbox/live-snapshot`            | `POST` | AI real-time snapshot of current inbox activity                  |
| `/api/inbox/collaborate`              | `POST` | Create a new collaboration session                               |
| `/api/inbox/collaborate/[id]`         | `GET`  | Fetch collaboration session details                              |
| `/api/inbox/collaborate/[id]/entries` | `POST` | Add an entry to a collaboration session                          |
| `/api/inbox/collaborate/[id]/stream`  | `GET`  | SSE stream for real-time collaboration updates                   |
| `/api/user`                           | `GET`  | Get current user profile                                         |
| `/api/user/ensure-org`                | `POST` | Auto-creates default organization for the user                   |

---

## 🧑‍💻 Key Commands

```bash
pnpm dev              # Start Next.js dev server on port 3000
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # Run ESLint

pnpm drizzle-kit generate   # Generate new migration from schema changes
pnpm drizzle-kit migrate    # Apply pending migrations
pnpm drizzle-kit push       # Push schema directly (skip migrations)
pnpm drizzle-kit studio     # Open Drizzle Studio GUI
```

---

## 📄 License

MIT

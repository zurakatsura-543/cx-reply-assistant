# AI-Powered CX Reply Assistant

Datastraw Technologies Tech Lead assessment project.

This project is a full-stack customer experience reply assistant for ecommerce support teams. It lets a CX agent inspect customer conversations, view order context, retrieve brand-specific policy knowledge, generate an AI-assisted reply, edit the response, approve it, send it, and audit the full AI decision trail afterward.

## Live Links

- Frontend: `https://cx-reply-assistant-web.vercel.app`
- Backend API: `https://cx-reply-assistant-api.onrender.com/api`
- GitHub Repository: `https://github.com/zurakatsura-543/cx-reply-assistant`
- Architecture Document: `https://example.com/cx-reply-assistant-architecture`
- Demo Video: `https://example.com/cx-reply-assistant-demo`

## Product Goal

Support agents often reply to repetitive questions about refunds, damaged products, shipping, and cancellations. The risk is that agents may answer with outdated or wrong brand policies, especially when each brand has different rules.

This assistant solves that by combining:

- Customer conversation history
- Order metadata
- Brand-specific knowledge base entries
- Retrieval-augmented generation
- AI guardrails
- Agent review and approval
- Persistent audit logs

The result is not an auto-send chatbot. It is an agent-assist workflow where AI drafts the reply, but the human agent stays responsible for final approval.

## Key Features

- Conversation workspace for multiple customers and brands
- Customer and agent mode toggle for testing both sides of the conversation
- Order summary with item, delivery date, value, status, and order id
- Brand-scoped knowledge base manager
- AI reply generation from the NestJS backend
- Retrieval-augmented generation using relevant brand policies
- Guardrails for return/refund/date-sensitive cases
- Agent edit before sending
- Approve and send workflow
- Manual agent replies without AI
- Persistent AI logs stored in PostgreSQL
- Saved logs reload after browser refresh
- Duplicate knowledge entry protection
- Edit/save/cancel/delete flow for KB cards
- Save and delete confirmation for risky KB changes
- OpenAI-compatible model support
- Deterministic fallback generator when no AI key is configured

## Tech Stack

### Frontend

- React: UI framework for the agent dashboard
- TypeScript: static typing across UI state, API responses, and domain models
- Vite: fast development server and production build tool
- lucide-react: icon set used for buttons and dashboard actions

### Backend

- NestJS: structured Node.js backend framework
- TypeScript: shared typed development experience with the frontend
- pg: PostgreSQL client for database queries
- OpenAI-compatible Chat Completions API: used for AI reply generation

### Database

- PostgreSQL: primary persistence layer
- Supabase: hosted PostgreSQL used for the current implementation
- SQL schema: stored in `database/schema.sql`
- Seed data: stored in `database/seed.sql`

## Architecture Overview

```text
React + Vite Frontend
        |
        | HTTP JSON API
        v
NestJS Backend
        |
        | SQL queries
        v
PostgreSQL / Supabase
        |
        | brand-scoped policy retrieval
        v
RAG Context Builder
        |
        | strict prompt with customer, order, conversation, and KB context
        v
OpenAI-Compatible LLM
        |
        | suggested reply + confidence + guardrail
        v
Agent Review UI
        |
        | approve/edit/send
        v
Messages + AI Response Logs
```

For the fuller architecture write-up, see [docs/architecture.md](docs/architecture.md).

For the Mermaid architecture diagram, see [docs/architecture-diagram.md](docs/architecture-diagram.md).

## How RAG Works

RAG means Retrieval-Augmented Generation.

Instead of asking the model to answer from general knowledge, the backend first retrieves relevant brand knowledge. The retrieved policies are then passed into the prompt so the model can answer using the correct brand rules.

In this project:

1. The latest customer message is detected.
2. The backend loads the customer conversation and order.
3. The backend retrieves matching KB entries for that conversation's brand only.
4. The backend builds a strict prompt containing:
   - customer name
   - brand name and tone
   - order id, item, status, value, and delivery date
   - conversation history
   - retrieved brand policy context
5. The model returns a suggested response.
6. The agent can edit and approve the final message.
7. The system stores the customer message, retrieved context, AI response, final response, confidence, guardrail, and timestamp.

Brand scoping is important. Bloom Body Co. policies are never mixed with Urban Nutri Labs policies.

## Guardrails

The backend includes deterministic guardrails before calling the LLM for sensitive policy windows.

Examples:

- Damaged items for Bloom Body Co. must be reported within 7 days.
- Opened supplements for Urban Nutri Labs are not refundable unless damage or leakage is verified within 48 hours.
- Supplement returns are accepted only within 15 days for sealed products.

If the customer request appears outside a policy window, the backend marks the suggestion as `Needs review` and avoids making a confident refund or replacement promise.

This protects the business from hallucinated policy promises.

## Knowledge Base Management

Each brand has its own policy cards. A card includes:

- policy type
- title
- body

Existing policy type is shown as a fixed chip, not a dropdown. This avoids accidental type changes after a policy has been created.

Agents can:

- add a new policy note
- edit an existing policy title/body
- save changes after confirmation
- cancel an edit
- delete a policy after confirmation

Duplicate protection is implemented for `brand + policy type + title`. This avoids conflicting KB records such as two different refund windows with the same policy title.

## AI Logs

AI logs are persisted in PostgreSQL in `ai_response_logs`.

Each log stores:

- conversation id
- brand id
- customer message
- retrieved context
- AI-generated response
- edited response
- final approved response
- confidence
- guardrail
- timestamp

The UI shows the important audit fields for reviewers and agents. Internal AI provider metadata can also be retained by the backend for cost/debugging analysis without cluttering the product experience.

## Repository Structure

```text
cx-reply-assistant/
  apps/
    api/
      src/
        database/
        modules/
          ai/
          conversations/
          knowledge-base/
        main.ts
    web/
      src/
        App.tsx
        api.ts
        styles.css
        types.ts
  database/
    schema.sql
    seed.sql
  package.json
  README.md
```

## Environment Variables

Create `.env` in the project root.

```bash
VITE_API_URL="http://localhost:3000/api"
PORT="3000"
WEB_ORIGIN="http://localhost:5173,http://localhost:5174"

DATABASE_URL="postgres://postgres:postgres@localhost:5432/cx_reply_assistant"

OPENAI_API_KEY="your_api_key_here"
OPENAI_BASE_URL="https://api.openai.com/v1"
OPENAI_MODEL="gpt-4o-mini"
```

For Supabase, use the transaction pooler or direct connection string from the Supabase dashboard. If the database password contains special characters, percent-encode it inside the connection string.

For OpenRouter:

```bash
OPENAI_API_KEY="your_openrouter_key_here"
OPENAI_BASE_URL="https://openrouter.ai/api/v1"
OPENAI_MODEL="openai/gpt-4o-mini"
```

If `OPENAI_API_KEY` or `OPENAI_MODEL` is missing, the backend uses a deterministic fallback response generator so the app can still be tested.

## Local Setup

Install dependencies:

```bash
npm install
```

Run the backend:

```bash
npm run dev:api
```

Run the frontend in a second terminal:

```bash
npm run dev:web
```

Open the frontend:

```text
http://localhost:5173
```

The backend runs by default on:

```text
http://localhost:3000/api
```

## Database Setup

For a local PostgreSQL database:

```bash
createdb cx_reply_assistant
psql cx_reply_assistant -f database/schema.sql
psql cx_reply_assistant -f database/seed.sql
```

For Supabase:

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `database/schema.sql`.
4. Run `database/seed.sql`.
5. Copy the PostgreSQL connection string.
6. Add it to `.env` as `DATABASE_URL`.

When `DATABASE_URL` is configured, the NestJS API reads and writes real PostgreSQL data.

When `DATABASE_URL` is missing, the API falls back to in-memory seed data for local demos.

## Available Scripts

```bash
npm run dev:api
```

Starts the NestJS API in watch mode.

```bash
npm run dev:web
```

Starts the Vite frontend dev server.

```bash
npm run build
```

Builds both frontend and backend.

```bash
npm run build:web
```

Builds only the frontend.

```bash
npm run build:api
```

Builds only the backend.

```bash
npm run lint
```

Runs linting for both workspaces.

## Manual Testing Checklist

### Conversation Flow

1. Start backend and frontend.
2. Open `http://localhost:5173`.
3. Select `Agent` mode.
4. Select `Aarav Mehta`.
5. Click `Generate Reply`.
6. Confirm retrieved Bloom Body Co. context appears.
7. Edit the AI reply.
8. Click `Approve & Send`.
9. Confirm the final agent message appears in the conversation.

### Customer Flow

1. Switch to `Customer` mode.
2. Confirm the AI reply panel is hidden.
3. Send a new customer message.
4. Switch back to `Agent` mode.
5. Generate a reply for the latest customer message.

### Guardrail Flow

1. Select `Neha Rao`.
2. Send a customer message about leaking supplement packaging after 20 days.
3. Generate a reply.
4. Confirm the response is cautious and marked `Needs review`.
5. Confirm it does not promise a refund or replacement.

### Knowledge Base Flow

1. Select a brand in `Brand Knowledge Base`.
2. Add a new policy note.
3. Try adding the same policy type and title again.
4. Confirm duplicate protection blocks it.
5. Edit an existing policy card.
6. Confirm save asks for confirmation.
7. Click delete.
8. Confirm delete asks for confirmation.

### Logs Flow

1. Generate and approve at least one AI reply.
2. Open `AI Logs`.
3. Confirm the log contains customer message, retrieved policy titles, guardrail, AI response, and final response.
4. Refresh the browser.
5. Open `AI Logs` again.
6. Confirm logs are still present from PostgreSQL.

## Security Notes

- AI API keys are used only by the NestJS backend.
- The frontend never receives the OpenAI API key.
- Database access is centralized in the backend.
- The schema includes brand-scoped tables and row-level security policies for a production Supabase setup.
- `.env` must never be committed.
- Local handoff notes such as `LOCAL_CODEX_HANDOFF.md` are intentionally ignored from Git.

## Cost and Reliability Notes

- The backend can retain provider usage metadata for cost and debugging analysis.
- The visible UI hides provider details to keep the user experience clean.
- The app has deterministic fallback generation so demos do not fail when an AI provider is unavailable.
- Guardrails run before model generation for sensitive policy cases.
- AI responses require human approval before being sent.

For the written cost/debugging scenario answer, see [docs/ai-cost-debugging.md](docs/ai-cost-debugging.md).

For leadership and ownership answers, see [docs/leadership-ownership.md](docs/leadership-ownership.md).

For the demo plan and final submission checklist, see [docs/demo-video-script.md](docs/demo-video-script.md) and [docs/final-submission-checklist.md](docs/final-submission-checklist.md).

## Assessment Alignment

This project directly addresses the assessment goals:

- Product ownership: the app solves a realistic CX workflow, not just an isolated AI call.
- RAG understanding: answers are generated from retrieved brand-specific policies.
- Guardrails: risky refund/replacement cases are handled cautiously.
- Engineering quality: frontend, backend, database, and AI provider are separated cleanly.
- Persistence: conversations, KB entries, and AI logs are stored in PostgreSQL.
- Security: API keys stay server-side.
- Reliability: fallback generation keeps the demo usable.
- Auditability: every AI generation can be reviewed through logs.

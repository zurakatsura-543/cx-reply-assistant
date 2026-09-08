# AI-Powered CX Reply Assistant

Datastraw Technologies assessment submission.

This app demonstrates a focused customer support workflow where an agent can review a customer conversation, retrieve brand-specific knowledge, generate an AI-assisted reply, edit it, approve it, and send it back into the conversation.

## Current Scope

- Conversation workspace with customer, brand, order, history, and latest customer message
- Customer/agent mode toggle for end-to-end reply loop testing
- Two mock brands with meaningfully different policies
- Knowledge base create/edit/delete per brand
- Brand-scoped retrieval before response generation
- Guardrailed reply generation simulation
- Agent edit, regenerate, approve, and manual send
- AI generation log panel

## Tech Stack

- Frontend: React, TypeScript, Vite, lucide-react
- Backend: NestJS
- Database target: PostgreSQL/Supabase
- AI target: OpenAI-compatible API such as OpenRouter

The current implementation includes a typed frontend and a NestJS API. The frontend calls the API for conversations, message sending, brand KB management, AI reply generation, and approval. The API currently uses in-memory seed data while the PostgreSQL schema documents the production persistence model.

## Local Setup

```bash
npm install
npm run dev:api
npm run dev:web
```

Run `dev:api` and `dev:web` in separate terminals during local development.

## Planned Production Additions

- Connect the NestJS services to PostgreSQL using `DATABASE_URL`
- Supabase Auth and tenant-scoped row-level security
- Server-side AI generation route using an OpenAI-compatible provider
- Deployment on Vercel
- Architecture diagram and written assessment responses

## Database

PostgreSQL schema is documented in `database/schema.sql`.

Every major table carries `brand_id`. In production, brand isolation is enforced at:

- Auth/session layer: agent belongs to one or more brands through `brand_users`
- API layer: every query is scoped by the authenticated agent's allowed `brand_id`
- Database layer: Supabase/PostgreSQL row-level security prevents cross-brand reads/writes
- Retrieval layer: KB retrieval filters by `brand_id` before ranking entries

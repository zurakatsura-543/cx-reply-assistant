# Scaled Architecture Document

## 1. Goal and System Overview

The assessment implementation is a working MVP of an AI-powered CX reply assistant. If the product succeeds, the scaled system must support 500 brands, 5,000 CX agents, millions of messages, multiple communication channels, AI-generated responses, and brand-specific knowledge bases.

At scale, I would design the system as a multi-tenant, event-driven platform. The core principle is that customer messages should be ingested reliably, processed idempotently, enriched with customer and order data, matched only with the correct brand knowledge, drafted by AI with guardrails, reviewed by a human agent, and then sent through the correct external channel.

The main components are:

- React agent workspace for CX agents and brand admins
- API gateway for authenticated frontend traffic
- webhook gateway for external channel events
- NestJS or similar backend services split by domain
- PostgreSQL as the primary transactional database
- Redis for sessions, rate limits, and hot conversation cache
- object storage for attachments and large transcripts
- vector database or pgvector for brand-filtered knowledge retrieval
- message queue and workers for asynchronous processing
- AI layer for retrieval, guardrails, prompt construction, model routing, and evaluation
- observability layer for logs, metrics, traces, alerts, and audit records

## 2. Frontend, APIs, Database, Auth, and Integrations

The frontend would remain a React web application, but the production version would be role-aware. CX agents would see assigned queues, conversations, order context, retrieved knowledge, AI drafts, approvals, and logs. Brand admins would manage brand policies, tone, permissions, and escalation rules. Internal Datastraw admins would manage tenants, integrations, billing, and operational health.

The backend should be structured by domain instead of one large service. I would use services or modules for conversations, knowledge base, AI generation, approvals, integrations, users/auth, and audit logging. These can start as a modular monolith and later split into independent services when traffic or team ownership requires it. The API gateway would enforce authentication, rate limits, request validation, and tenant context.

PostgreSQL would be the source of truth for brands, users, memberships, conversations, messages, orders, policies, approvals, and AI logs. Every tenant-scoped table would include `brand_id` or `tenant_id`. High-volume tables such as messages and AI logs would be indexed by brand, conversation, and timestamp, and later partitioned by time or tenant if needed. Read replicas can serve analytics and log views so operational reporting does not slow down agent workflows.

Authentication would use SSO/OAuth plus role-based access control. A user should not simply request a brand id from the frontend and receive data. The backend must derive allowed brand access from the authenticated user's membership. Database row-level security can add another layer of protection so even a backend bug is less likely to leak data across brands.

External integrations should be isolated behind an integration service. Ecommerce platforms, helpdesks, CRM systems, email, WhatsApp, chat, and social channels all have different APIs and failure modes. The integration service normalizes inbound events into a common message format and normalizes outbound sends into channel-specific delivery requests.

## 3. Multi-Brand Data Isolation

Brand isolation must be enforced in multiple layers.

First, authentication must attach a trusted tenant context to every request. The frontend can display the selected brand, but the backend should verify that the authenticated user belongs to that brand before reading or writing anything.

Second, all tenant data tables should include `brand_id` or `tenant_id`, and every query must filter by that value. Common queries should go through repository/helper methods that require tenant context, so engineers do not hand-write unsafe queries repeatedly.

Third, the knowledge retrieval system must enforce brand filters at retrieval time. Vector search must include metadata filters such as `brand_id`, `policy_status`, and optionally `effective_from` / `effective_to`. Without metadata filtering, a semantically similar policy from Brand B could be retrieved for Brand A.

Fourth, background jobs and webhooks must carry tenant context in the job payload, and workers must re-validate it before processing. Idempotency keys should include channel, external message id, and brand id.

Finally, audit logs should record who accessed or changed sensitive data, which brand it belonged to, and what final message was sent. This makes accidental access detectable.

## 4. AI Reliability

The AI system should be reliable because it is surrounded by deterministic controls. The model should not be the source of truth for policy eligibility.

Knowledge retrieval should use a hybrid approach: keyword search for exact policy terms and vector search for semantic matches. Retrieval must be brand-filtered, ranked, and capped to a small top-k set. Each retrieved passage should include policy title, policy type, version, and effective date.

The prompt should include only the context needed to answer the current customer message: latest customer request, relevant conversation summary, order facts, retrieved policies, brand tone, and explicit rules about uncertainty. Structured order data should override customer-relative wording. For example, if a customer says "I received this 2 days ago" but the order says it was delivered on August 18, 2026, the assistant should use the order date.

Guardrails should run before and after model generation. Pre-generation guardrails compute facts such as delivery age, refund window status, required documents, and risky topics. Post-generation guardrails check whether the draft promises a refund, invents policy, ignores required evidence, or contradicts the order record.

Confidence should be based on retrieval quality, policy match strength, guardrail status, and model output validation. Low-confidence replies should be marked for review, fall back to a safe template, or ask the agent to escalate. The system should never silently auto-send a risky AI response.

Evaluation should include offline test sets for the most common support scenarios, especially refunds, damaged items, cancellations, and conflicting dates. Production feedback should compare AI draft vs. agent-edited final reply. High edit distance or repeated overrides are signals that retrieval, policy data, or prompting needs improvement.

## 5. Scalability and What Breaks First

Going from 20 brands to 500 brands, the first things likely to break are retrieval quality, message processing reliability, and database/query performance.

Retrieval breaks when too many policies are searched without strict tenant filtering, versioning, and ranking. I would move from simple keyword matching to a dedicated retrieval service using hybrid search, metadata filters, policy versioning, and evaluation tests.

Message processing breaks when multiple channels send duplicate or bursty webhook events. I would add a webhook gateway, durable queue, idempotent workers, retry policies, and dead-letter queues. The agent UI should read from the database state rather than directly depending on webhook timing.

Database performance breaks when millions of messages and logs live in the same unpartitioned tables. I would add proper indexes, read replicas, time-based partitioning for logs/messages, archiving for old transcripts, and Redis caching for hot conversations.

Team velocity can also break. A modular monolith is a good starting point, but domain boundaries should be clear enough to split services later without rewriting the product.

## 6. Reliability Scenarios

If a webhook is received twice, the webhook gateway should verify the signature, compute an idempotency key using brand id, channel, and external message id, and insert/process only once. Duplicate events should return success without creating duplicate messages.

If an external API times out, the integration service should retry with exponential backoff. The conversation should show a pending or sync-delayed state, and the failed call should move to a dead-letter queue after repeated failures. Agents should not be blocked from viewing the existing conversation.

If an AI request fails, the backend should return a safe fallback: either a deterministic template, a "needs manual review" state, or a retry option. The failure should be logged with enough metadata to debug provider, timeout, and prompt version issues.

If a message was processed but the response was not sent, the system should use a durable outbox pattern. The approved response is saved in the database as `pending_send`, and a worker sends it to the channel. Once the channel confirms delivery, the status changes to `sent`. If sending fails, the message remains retryable and visible to the agent instead of disappearing.

This architecture keeps the system safe, scalable, and auditable while preserving the main product principle: AI assists the agent, but policy, tenant isolation, and final accountability stay under deterministic system control.


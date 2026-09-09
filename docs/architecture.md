# CX Reply Assistant Architecture

## 1. Executive Summary

The AI-Powered CX Reply Assistant is a full-stack agent-assist application for ecommerce support teams. The goal is to help agents answer refund, damaged item, shipping, and cancellation questions using the correct brand policy and the actual order context.

The system is intentionally not an auto-send chatbot. AI drafts a response, but the agent reviews, edits, approves, and sends the final message. This keeps accountability with the human while still reducing repetitive writing work.

Live application:

- Frontend: `https://cx-reply-assistant-web.vercel.app`
- Backend API: `https://cx-reply-assistant-api.onrender.com/api`
- Repository: `https://github.com/zurakatsura-543/cx-reply-assistant`

## 2. System Components

The frontend is a React and Vite application deployed on Vercel. It provides the agent workspace, customer simulation mode, conversation timeline, AI reply panel, retrieved context panel, brand knowledge base manager, and AI logs view.

The backend is a NestJS API deployed on Render. It owns all business logic, database access, retrieval, guardrails, AI provider calls, approvals, and audit logging. Keeping these responsibilities server-side prevents API keys and database credentials from being exposed to the browser.

Supabase PostgreSQL is the persistence layer. It stores brands, policies, conversations, messages, orders, and AI response logs. The database gives the app durable state, so conversations, KB updates, and logs survive refreshes and redeploys.

The AI provider is accessed through an OpenAI-compatible Chat Completions interface. The model is treated as a replaceable provider behind the backend. If the provider is unavailable or no key is configured, the backend has a deterministic fallback generator so the demo can still run.

## 3. Request Flow

When the frontend loads, it calls the backend for brands, conversations, and saved AI logs. The selected conversation determines the active customer, brand, order, and knowledge base.

When the agent clicks `Generate Reply`, the frontend sends the conversation id to the backend. The backend loads the latest customer message, the full message history, the order metadata, and the brand's policy notes. Retrieval then selects the most relevant policy entries for the customer request.

Before the model is called, the backend computes deterministic facts such as the number of days since delivery. This is important because a customer can say "I received this 2 days ago", but the order record may show a different delivery date. The system should trust the structured order record over the customer's relative wording.

The backend builds a constrained prompt containing:

- customer name
- brand name and brand tone
- order id, item, value, status, and delivery date
- latest customer message being replied to
- conversation history
- retrieved brand policy context
- guardrail instructions

The AI response is returned to the frontend as a draft. The agent can edit it and then approve it. Approval writes the final agent message into the conversation and persists the audit trail.

## 4. Retrieval-Augmented Generation

RAG means Retrieval-Augmented Generation. In this project, the model does not answer from general knowledge alone. The backend retrieves brand-specific policy notes first, then provides those notes to the model as context.

Brand scoping is the most important retrieval rule. Bloom Body Co. policies must never be mixed with Urban Nutri Labs policies. This prevents cross-brand policy leakage and protects the quality of the support response.

The current retrieval implementation uses lightweight keyword scoring over policy type, title, and body. That is enough for this assessment because the policy set is small and controlled. In a production system, the next step would be embeddings with metadata filters for brand id, policy type, active status, and effective date.

## 5. Guardrails

The highest-risk replies are refund, replacement, cancellation, and damaged product cases. The backend applies deterministic guardrails for these cases before and during generation.

Examples:

- If an order was delivered outside the allowed return window, the assistant should not promise a refund.
- If damaged item reporting requires photos or batch details, the assistant should request those details.
- If the customer's relative date conflicts with the structured delivery date, the response should mention the actual delivery date and use that as the source of truth.
- If the case is uncertain, the response is marked as needing review.

This design reduces hallucination risk because critical eligibility logic does not depend only on the model.

## 6. Data Model

The database is organized around brand-scoped support data:

- `brands`: brand name and tone
- `brand_policies`: policy type, title, and body
- `conversations`: customer, brand, order, and status linkage
- `conversation_messages`: customer and agent message history
- `orders`: item, delivery date, value, status, and order id
- `ai_response_logs`: AI draft, retrieved context, guardrail, confidence, final approved response, and timestamp

Knowledge base entries are editable in the UI, but duplicate protection is enforced around brand, policy type, and title. This prevents the RAG layer from retrieving conflicting records with the same policy identity.

## 7. Reliability, Security, and Operations

The frontend never receives the AI provider key. It only talks to the NestJS API. The backend reads secrets from environment variables and calls the provider server-side.

The backend supports both PostgreSQL and an in-memory fallback. PostgreSQL is used for deployed demos and durable state. The fallback exists only to make local setup easier when a database is not configured.

The deployed architecture separates hosting concerns:

- Vercel hosts the static frontend.
- Render hosts the API service.
- Supabase hosts PostgreSQL.
- The AI provider is called only by the backend.

Operationally, the important debugging surfaces are API logs, AI response logs, database records, and frontend error banners. The app also keeps the UI clean by hiding low-level provider metadata from agents.

## 8. Future Improvements

The current system is assessment-ready. The next production improvements would be:

- embeddings-based retrieval with brand metadata filters
- policy versioning and effective dates
- role-based access for agents, admins, and reviewers
- per-brand AI budget controls
- structured tracing for each AI generation
- evaluation tests for refund and date-sensitive edge cases
- multi-tenant auth and stricter row-level security enforcement


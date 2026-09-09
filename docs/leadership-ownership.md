# Leadership and Ownership Answers

## Product Ownership

I treated this assessment as a product workflow, not just an AI API integration. The important decision was to keep the assistant as agent-assist instead of auto-send. CX replies can affect refunds, replacements, and brand trust, so the system should help agents move faster while still requiring human approval.

The core product priorities were:

- show the conversation and policy context on the same screen
- make the AI reply clearly tied to the latest customer message
- keep brand knowledge editable but controlled
- prevent duplicate or conflicting policy notes
- persist AI logs for auditability
- hide technical model details from the agent UI

This keeps the product useful for a real support team while still demonstrating RAG, guardrails, persistence, and AI workflow design.

## Technical Ownership

I separated the frontend, backend, database, and AI provider responsibilities. The frontend owns the workspace experience. The backend owns policy retrieval, prompt construction, guardrails, provider calls, and persistence. The database owns durable records.

This separation matters because AI keys and database credentials must not be exposed to the browser. It also makes the system easier to debug: UI issues can be separated from API issues, and API issues can be separated from database or provider issues.

I also added fallback behavior so the demo can still run if the AI provider is unavailable. That is not a replacement for real AI generation, but it makes the product more resilient during development and demos.

## Handling Ambiguity

The assessment left room for interpretation, so I made explicit product choices:

- RAG is brand-scoped to avoid policy leakage.
- AI replies require agent approval.
- Customer mode does not show AI generation controls.
- Knowledge base cards support editing and deletion with confirmations.
- Duplicate KB entries are blocked by brand, type, and title.
- Date-sensitive guardrails trust structured order data over customer wording.

For example, if a customer says "I received this 2 days ago" but the order says delivery was August 18, 2026, the reply should mention the actual delivery date and base eligibility on that record. That is a product and safety decision, not only a prompt decision.

## Working With Stakeholders

If I were leading this in a team, I would align early with support, operations, and legal/compliance on what the assistant is allowed to say. Refund and replacement promises should be controlled by policy, not invented by the model.

I would ask support leads for the top 20 recurring contact reasons and turn those into test cases. I would ask operations which order fields are reliable. I would ask leadership where the business wants strict denial versus escalation for review.

The launch would be staged:

1. Internal demo with seed data.
2. Pilot with a small agent group.
3. Read-only suggestions with mandatory approval.
4. Monitoring of edited responses and guardrail misses.
5. Wider rollout after quality is proven.

## Incident Ownership

If the assistant generated a wrong refund promise, I would handle it as a product incident:

- preserve the AI log and final approved response
- identify the exact retrieved context and prompt version
- check whether the issue was retrieval, policy data, guardrail logic, model behavior, or agent approval
- add a regression test for the case
- update the policy, prompt, or deterministic guardrail
- communicate the fix and any customer impact clearly

The lesson is that AI systems need ownership after launch. Shipping the model call is only the beginning; the real work is making the system observable, correctable, and accountable.

## Leadership Style

My leadership style here is practical and product-minded. I would keep the team focused on the user workflow, the business risk, and the smallest reliable system that solves the problem. I would avoid treating AI as magic. The model should be one component inside a controlled system with retrieval, guardrails, review, logs, and clear ownership.


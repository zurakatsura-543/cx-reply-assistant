# Demo Video Script

Target length: under 5 minutes.

## 0:00 - 0:20 Intro

Open with the deployed frontend.

Say:

"This is the AI-Powered CX Reply Assistant built for the Datastraw Tech Lead assessment. It is a full-stack agent-assist workflow for ecommerce support teams. The frontend is deployed on Vercel, the backend is deployed on Render, and data is persisted in Supabase PostgreSQL."

## 0:20 - 0:55 Architecture

Briefly show the README or architecture diagram.

Say:

"The frontend talks to a NestJS API. The backend loads the conversation, order, brand, and knowledge base from PostgreSQL. It retrieves brand-specific policies, applies deterministic guardrails, calls an OpenAI-compatible model, and stores an AI response log. The agent reviews and approves before anything is sent."

## 0:55 - 1:45 Conversation Flow

Go back to the app. Select a conversation.

Show:

- customer list
- order metadata
- conversation timeline
- customer/agent mode toggle

Say:

"The agent can see the customer message, order details, delivery date, value, and conversation history in one workspace. This is important because the AI response should be based on the actual order record, not only the customer's wording."

## 1:45 - 2:35 RAG and Guardrails

Click `Generate Reply` for a refund or leakage case.

Show:

- `Replying to` panel
- retrieved policy context
- generated response

Say:

"The assistant retrieves Urban Nutri Labs policies only for this Urban Nutri Labs conversation. It does not mix policies between brands. The reply also uses the delivery date from the order record. If the order is outside the policy window, it gives a cautious response and does not promise a refund."

## 2:35 - 3:20 Agent Review and Send

Edit the reply slightly and send it.

Show:

- button changes to sending state
- message appears in timeline
- delete confirmation for accidental messages if needed

Say:

"The AI does not auto-send. The agent can edit the draft, approve it, and send. The UI gives feedback while sending so agents do not click twice or feel confused."

## 3:20 - 4:05 Knowledge Base

Scroll to Brand Knowledge Base.

Show:

- brand selector
- policy cards
- edit button
- save confirmation
- duplicate protection
- delete confirmation

Say:

"The knowledge base is brand-scoped and editable. Existing policy types are fixed chips, so an agent does not accidentally change the category. Duplicate policy notes are blocked to avoid confusing retrieval with conflicting policy records."

## 4:05 - 4:35 AI Logs

Open AI Logs.

Show:

- customer message
- retrieved context
- guardrail
- AI response
- final response

Say:

"Each AI generation is logged for auditability. A reviewer can see what the customer asked, what context was retrieved, what the model drafted, and what final response was approved."

## 4:35 - 5:00 Close

Say:

"The key design choice is that this is not just a chat UI. It is a controlled AI workflow with RAG, guardrails, human approval, persistence, and operational visibility. That makes it safer and more realistic for CX teams."

## Recording Checklist

- Use the deployed frontend URL.
- Keep browser zoom at 90 or 100 percent.
- Do one clean generate-reply example.
- Show one KB edit/save confirmation.
- Show AI logs.
- Keep the final video under 5 minutes.
- Add the video link to README after uploading.


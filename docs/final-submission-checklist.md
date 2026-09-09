# Final Submission Checklist

## Code and Repository

- [ ] GitHub repository is public or shared with reviewers.
- [ ] Root `README.md` has live frontend and backend links.
- [ ] Root `README.md` explains product goal, tech stack, setup, RAG, guardrails, and logs.
- [ ] `.env` is not committed.
- [ ] Local-only handoff notes are not committed.
- [ ] Latest frontend and backend changes are pushed to `main`.

## Deployment

- [ ] Frontend production URL works: `https://cx-reply-assistant-web.vercel.app`
- [ ] Backend health/API works: `https://cx-reply-assistant-api.onrender.com/api/brands`
- [ ] Vercel `VITE_API_URL` points to `https://cx-reply-assistant-api.onrender.com/api`
- [ ] Render backend has `DATABASE_URL`, `WEB_ORIGIN`, and AI provider environment variables configured.
- [ ] CORS allows the Vercel frontend origin.
- [ ] Hard refresh confirms the latest UI is loaded.

## Product Demo

- [ ] Conversation list loads.
- [ ] Customer mode can send a customer message.
- [ ] Agent mode shows AI Reply panel.
- [ ] Customer mode hides AI Reply panel.
- [ ] Generate Reply targets the latest customer message.
- [ ] Retrieved context appears in the AI panel.
- [ ] Guardrail response uses structured delivery date when dates conflict.
- [ ] Agent can edit and send the final reply.
- [ ] Send button shows sending/sent feedback.
- [ ] Accidental messages can be deleted after confirmation.

## Knowledge Base

- [ ] Brand selector switches policy sets.
- [ ] Policy cards display type, title, and body.
- [ ] Existing policy type is shown as a fixed chip.
- [ ] Add policy note works.
- [ ] Duplicate brand/type/title policy note is blocked.
- [ ] Edit and save flow works.
- [ ] Save confirmation appears.
- [ ] Delete confirmation appears.

## AI Logs

- [ ] Logs persist in PostgreSQL.
- [ ] Logs reload after browser refresh.
- [ ] Logs show customer message, retrieved context, AI response, final response, confidence, guardrail, and timestamp.
- [ ] UI does not clutter reviewers with raw provider token details.

## Written Submission

- [ ] Architecture diagram is complete: `docs/architecture-diagram.md`
- [ ] Architecture document is complete: `docs/architecture.md`
- [ ] AI cost/debugging answer is complete: `docs/ai-cost-debugging.md`
- [ ] Leadership/ownership answers are complete: `docs/leadership-ownership.md`
- [ ] Demo video script is complete: `docs/demo-video-script.md`
- [ ] Demo video is recorded under 5 minutes.
- [ ] Demo video link is added to README.
- [ ] Any placeholder links are replaced before final submission.


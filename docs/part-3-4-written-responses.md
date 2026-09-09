# Part 3 and Part 4 Written Responses

## Part 3 - Technical Problem Solving

### Scenario 1 - AI Costs

Datastraw's AI cost increased from INR 20k/month to INR 1 lakh/month in three months, while customer and conversation volume increased by only around 40 percent. I would treat this as a cost incident and investigate it in two parts: first, where the extra usage is coming from; second, whether the system is using AI efficiently for each request.

The first thing I would check is usage by route and event type. I would compare the number of AI calls for generate reply, regenerate reply, approval, summarization, retrieval, background processing, and any retries. If conversation volume grew by 40 percent but AI calls grew by 200 percent, the issue is probably unnecessary AI calls, duplicate requests, retries, or agents regenerating too often.

Next, I would check model selection. A small customer support question may not need the most expensive model. I would look at which models are being used, whether the default model changed recently, and whether high-cost models are being used for low-risk cases. I would move to model routing: cheaper models or deterministic templates for simple questions, stronger models only for complex refund, policy conflict, or escalation cases.

Then I would investigate token usage. Even if request count is normal, cost can grow if prompts became too large. I would check average prompt size, average completion size, conversation history length, retrieved knowledge size, and whether we are sending too many policy entries to the model. The prompt should include only the latest customer message, essential conversation summary, order facts, brand tone, and the top few relevant policy snippets. Old conversation history should be summarized instead of repeatedly sent in full.

Retrieval is another important area. If retrieval returns too many policies, irrelevant policies, or cross-brand data, the model receives a larger and lower-quality prompt. I would cap retrieval to a small top-k result set, require brand_id filtering, rank policies by relevance, and include only active policy versions. I would also cache stable retrieval results for repeated questions within the same brand.

I would also check caching and repeat work. Some AI outputs can be cached or avoided. For example, if the same agent clicks generate multiple times for the same unchanged customer message, the system can reuse the previous draft or require an explicit regenerate action. Static policy summaries can be precomputed. Repeated order lookups can be cached briefly. However, I would avoid caching final customer replies too aggressively because the exact conversation and order context matters.

Unnecessary AI calls are a common cause of cost growth. I would check frontend behavior for double-clicks, page refreshes, duplicate API calls, and automatic generation on every render. I would disable generate buttons while a request is in progress, add idempotency keys for AI generation, and add a short cooldown for regenerate.

For monitoring, I would add dashboards and alerts for:

- AI cost by brand
- AI calls by route
- average prompt and completion size
- model usage by percentage
- retry count and failure rate
- cost per conversation
- top users or brands by AI usage
- low-confidence response rate

For rate limits, I would add per-brand and per-agent limits with sensible exceptions for support leads. I would also add monthly AI budgets and alert before crossing thresholds instead of finding out only after the provider bill arrives.

Architecturally, I would move AI generation behind a dedicated AI service. That service would own prompt versioning, retrieval limits, model routing, caching, budget checks, retries, and logging. This prevents every product feature from calling the AI provider directly and makes cost control easier.

The changes I would likely make are:

- add AI usage dashboards and budget alerts
- add idempotency for generate-reply requests
- cap retrieved context and prompt size
- summarize long conversation history
- route simple cases to cheaper models or templates
- reserve stronger models for risky cases
- cache repeated retrieval and unchanged generations
- add rate limits by brand and agent
- review prompts to remove unnecessary text
- track cost per conversation and per brand

My decision process would be data-first. If call volume increased, I would fix duplicate or unnecessary calls. If tokens per call increased, I would reduce prompt size and retrieval size. If model mix changed, I would introduce model routing. I would not make the system worse for agents just to reduce cost; I would reduce waste first, then optimize model quality and prompt efficiency.

## Part 4 - Leadership and Ownership

### 1. Leadership

I have taken ownership in situations where less experienced developers needed technical direction, code review, debugging help, and clearer implementation steps. My responsibility was to help them understand the problem, break the work into smaller pieces, review their code, explain tradeoffs, and make sure the final work was reliable enough to ship.

The most difficult part is balancing support with independence. If I give the full answer immediately, the junior developer may complete the task but not grow. If I give too little guidance, they may feel stuck and lose confidence. I try to explain the reasoning, give examples, review the important parts carefully, and let them own the final implementation.

As a tech lead, I would want juniors to feel safe asking questions, but I would also set clear expectations around code quality, testing, communication, and ownership.

### 2. Giving Feedback

If a junior developer repeatedly submits code that works but is poorly structured, and I have already discussed it once, I would handle it more concretely the second time.

First, I would review one recent pull request with them and point to specific examples instead of giving general feedback like "write cleaner code." I would explain what makes the code hard to maintain, such as unclear naming, repeated logic, large functions, weak boundaries, missing tests, or hidden side effects.

Then I would give them a small checklist to use before submitting:

- is the function doing one clear thing?
- are names easy to understand?
- is duplicated logic extracted only where it genuinely helps?
- are edge cases covered?
- are tests added for risky behavior?
- would another developer understand this in six months?

For the next few PRs, I would review earlier and more frequently so the feedback comes before they spend too much time in the wrong direction. If needed, I would pair with them on one refactor so they can see the standard in practice.

I would be direct but respectful. The goal is not to embarrass them. The goal is to make the quality bar clear and help them reach it.

### 3. Disagreement

If a developer strongly disagrees with an architectural decision I made, I would first try to understand their concern fully. Strong disagreement often means there is a risk I may have missed.

I would ask them to explain the tradeoff they see: performance, maintainability, cost, complexity, timeline, reliability, or team skill. Then I would compare both options against the actual product needs and constraints.

If their argument is better, I would change my decision and give them credit. If my decision still seems better, I would explain why and document the reasoning so the team understands the direction. If the decision is high-impact and reversible, I may choose the simpler path and set a review point. If it is high-impact and hard to reverse, I would involve another senior engineer or stakeholder before finalizing.

I do not think architecture should be decided by ego. It should be decided by evidence, constraints, and the long-term health of the system.

### 4. Mistake and Ownership

One technical mistake I have learned from is underestimating the impact of a small backend or data-handling change because it looked simple at first. A change can appear safe in isolation but still affect users if it touches shared workflows, edge cases, or production data.

The important lesson is that ownership starts after realizing the mistake. I would first acknowledge it quickly, communicate the impact, and stop the issue from spreading. Then I would investigate the root cause, fix the immediate problem, and add a regression test or checklist item so the same issue is less likely to happen again.

I try not to hide mistakes or blame others. In engineering, mistakes happen. What matters is whether we respond quickly, protect users, learn from it, and improve the system.

### 5. Joining Datastraw - First 30 Days

If I joined Datastraw and found messy processes, incomplete documentation, and unclear ways of working, I would not try to change everything immediately. My first 30 days would be about understanding, stabilizing, and earning trust.

In the first week, I would meet engineers, product/business stakeholders, and support/operations users. I would learn what the product does, where the most painful technical areas are, how deployments happen, where incidents come from, and what work is currently blocked.

In the second week, I would map the system at a practical level: services, databases, third-party integrations, deployment flow, environments, logs, ownership areas, and common failure points. I would also improve documentation where I see obvious gaps, especially local setup and deployment steps.

In the third week, I would pick one or two small but meaningful improvements. Examples could be adding a deployment checklist, improving error logging, documenting an unclear module, adding missing tests around a risky workflow, or cleaning one painful developer process.

In the fourth week, I would propose a lightweight engineering operating rhythm:

- clear task ownership
- short design notes for important changes
- pull request standards
- deployment checklist
- incident notes when something breaks
- documentation ownership
- regular technical debt review

I would avoid creating heavy process for its own sake. The goal would be to make the team faster, calmer, and more reliable.

## AI Usage

### 1. Which AI tools did I use?

I used ChatGPT/Codex as a coding and reasoning assistant. I also used Mermaid tooling to create and refine the architecture diagram.

### 2. How did I use AI?

I used AI in three main ways.

First, I used it to speed up implementation work: reviewing the existing project structure, identifying where frontend and backend changes should go, and generating focused code changes for the CX assistant workflow.

Second, I used it to improve product quality. For example, I refined the conversation screen so agents can see the knowledge context and the reply target clearly. I also added UX details like sending states, delete confirmation, save confirmation, and duplicate knowledge protection.

Third, I used it to draft and refine written submission material, including the architecture explanation, cost debugging answer, leadership answers, and demo script. I reviewed and corrected the output so it matched the assessment prompt and the actual project.

### 3. What did AI get wrong?

One clear mistake was in the first architecture diagram. The AI initially produced a diagram that explained the current MVP implementation flow: React frontend, NestJS API, PostgreSQL, RAG, LLM, and logs. That was technically accurate for the built app, but it did not fully answer Part 2 of the assessment.

Part 2 asked for a scaled system design for 500 brands, 5,000 agents, millions of messages, multiple channels, queues, authentication, multi-brand isolation, and reliability failure cases. I identified that mismatch and changed the diagram and document to focus on the scaled architecture instead.

Another issue was that a detailed diagram became too visually cluttered, with too many crossing arrows. I simplified it into a cleaner system-level diagram using grouped components and fewer arrows. That made it easier for reviewers to understand the architecture quickly.

This is how I prefer to use AI: as a fast assistant, not as an unquestioned decision-maker. I still need to verify whether the answer fits the product, the codebase, and the assessment requirements.


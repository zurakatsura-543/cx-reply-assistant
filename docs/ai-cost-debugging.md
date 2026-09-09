# AI Cost and Debugging Scenario

## Scenario

If AI costs suddenly doubled, I would treat it like a production incident: first confirm the metric, then isolate the cause, then apply a reversible mitigation, and finally add controls so the same issue is easier to catch next time.

## Investigation Plan

First, I would verify whether the cost increase is real or a reporting issue. I would compare provider billing, backend AI logs, deployment timestamps, and request volume over the same time window.

Then I would break the increase down by:

- number of generate-reply calls
- number of approve calls
- average prompt size
- average response size
- model/provider used
- retry count and timeout rate
- brand or conversation causing the spike
- release or deployment that changed behavior

In this app, I would inspect `ai_response_logs`, Render logs, and frontend behavior around the `Generate Reply` and `Regenerate Reply` buttons. I would specifically check for duplicate requests caused by double-clicks, retries, page refreshes, or a frontend state bug.

## Likely Root Causes

The most likely causes are:

- a UI bug firing multiple generate requests for one click
- too much conversation history being included in every prompt
- too many knowledge base entries being retrieved
- a model change to a more expensive provider
- retry loops after provider failures
- users regenerating repeatedly because the first response is not useful
- missing rate limits or per-session budgets

## Immediate Mitigation

I would first protect the system without breaking the core workflow:

- disable the generate button while a request is in progress
- add a short cooldown for regenerate
- cap retrieved policy entries
- cap conversation history included in the prompt
- keep max response length reasonable
- fall back to a cheaper model for low-risk questions
- add temporary per-brand request limits if one tenant is driving the spike

The goal is to stop runaway spend while preserving the agent workflow.

## Long-Term Fix

Long term, I would add budget and observability controls:

- per-brand daily and monthly AI budgets
- alerts when usage crosses expected thresholds
- dashboard metrics by brand, model, route, and guardrail status
- trace ids connecting frontend action, backend request, provider call, and final log
- prompt version tracking
- evaluation tests for common support scenarios
- caching for repeated policy retrieval
- model routing based on risk level

For example, a simple shipping timeline question can use a cheaper model or deterministic response. A refund exception case should use stronger guardrails and may justify a higher-quality model.

## Debugging Answer

My answer would be: I would not immediately blame the model. I would first prove where the cost changed. If request count doubled, it is likely a product or frontend behavior issue. If request count stayed flat but cost doubled, it is likely prompt size, output length, model routing, or retries. I would use logs to isolate the affected brand, route, deployment, and scenario, then ship a narrow mitigation and follow up with budget alerts and better tracing.


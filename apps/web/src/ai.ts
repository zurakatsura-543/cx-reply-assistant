import type { AiSuggestion, Brand, Conversation, KnowledgeBaseEntry } from "./types";

const policyKeywords: Record<string, string[]> = {
  "Return policy": ["return", "broken", "damaged", "replace", "replacement", "opened"],
  "Refund policy": ["refund", "money", "paid", "payment", "broken", "damaged"],
  "Shipping policy": ["shipping", "delivered", "dispatch", "ship", "late", "replacement"],
  "Cancellation policy": ["cancel", "cancellation", "change order"]
};

export function retrieveContext(message: string, brand: Brand): KnowledgeBaseEntry[] {
  const terms = message.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

  return brand.policies
    .map((entry) => {
      const haystack = `${entry.type} ${entry.title} ${entry.body}`.toLowerCase();
      const keywordHits = (policyKeywords[entry.type] || []).filter((word) =>
        message.toLowerCase().includes(word)
      ).length;
      const termHits = terms.filter((term) => term.length > 3 && haystack.includes(term)).length;

      return { ...entry, score: keywordHits * 3 + termHits };
    })
    .filter((entry) => (entry.score ?? 0) > 0)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3);
}

export function generateReply(input: {
  brand: Brand;
  conversation: Conversation;
  retrievedContext: KnowledgeBaseEntry[];
}): AiSuggestion {
  const { brand, conversation, retrievedContext } = input;
  const latest = conversation.messages.at(-1)?.text || "";
  const lower = latest.toLowerCase();
  const contextText = retrievedContext.map((entry) => entry.body).join(" ");

  if (retrievedContext.length === 0) {
    return {
      confidence: "Needs review",
      guardrail: "No relevant brand policy was found. The assistant avoided making a policy promise.",
      text:
        "I am sorry about the trouble. I will need to verify the applicable policy for this order before confirming the next step. Could you please share any relevant photos or details so our support team can review this properly?"
    };
  }

  const mentionsOldDelivery = /20 days|twenty days|outside|long ago/.test(lower);
  const hasStrictWindow = /7 days|48 hours/.test(contextText);

  if (mentionsOldDelivery && hasStrictWindow) {
    return {
      confidence: "Needs review",
      guardrail:
        "The customer may be outside the policy window, so the assistant did not promise a refund.",
      text:
        `I understand why you are asking, and I am sorry this has been frustrating. Based on ${brand.name}'s policy, refund or damage claims may depend on the delivery window and verification details. I cannot confirm a refund immediately, but please share the order details and any photos so our team can review whether an exception or alternate resolution is possible.`
    };
  }

  if (/broken|damaged|leak|crack|bottle/.test(lower)) {
    return {
      confidence: "High",
      guardrail:
        "The response is grounded in the retrieved damaged-item policy and asks for verification before promising an outcome.",
      text:
        `I am really sorry your ${conversation.order.item} arrived damaged. Please share a clear photo of the broken item and the outer packaging, along with your order ID ${conversation.order.orderId}. Once we verify the damage under ${brand.name}'s policy, we will help you with the eligible replacement or refund option.`
    };
  }

  return {
    confidence: "Medium",
    guardrail:
      "Relevant policy was found, but the response avoids overcommitting until support verifies the details.",
    text:
      `Thanks for reaching out. Based on ${brand.name}'s policy, we will need to review your order details before confirming the resolution. Please share any supporting information and we will guide you through the next step.`
  };
}

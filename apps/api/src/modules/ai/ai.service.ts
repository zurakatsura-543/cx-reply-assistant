import { Injectable } from "@nestjs/common";
import { ConversationsService } from "../conversations/conversations.service";
import { KnowledgeBaseService } from "../knowledge-base/knowledge-base.service";
import type { AiLog, AiSuggestion, Brand, Conversation, KnowledgeBaseEntry } from "../../types";

@Injectable()
export class AiService {
  private logs: AiLog[] = [];

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly knowledgeBaseService: KnowledgeBaseService
  ) {}

  generateReply(conversationId: string, _regenerate: boolean) {
    const conversation = this.conversationsService.getConversation(conversationId);
    const brand = this.knowledgeBaseService.getBrand(conversation.brandId);
    const latestCustomerMessage = [...conversation.messages]
      .reverse()
      .find((message) => message.sender === "customer");
    const retrievedContext = this.knowledgeBaseService.retrieveContext(
      brand.id,
      latestCustomerMessage?.text ?? ""
    );
    const suggestion = this.generateGuardedReply(brand, conversation, retrievedContext);

    const log: AiLog = {
      id: `log-${Date.now()}`,
      conversationId,
      brandId: brand.id,
      customerMessage: latestCustomerMessage?.text ?? "",
      retrievedContext,
      aiGeneratedResponse: suggestion.text,
      agentEditedResponse: null,
      finalResponse: null,
      confidence: suggestion.confidence,
      guardrail: suggestion.guardrail,
      createdAt: new Date().toISOString()
    };

    this.logs.unshift(log);

    return {
      suggestion,
      retrievedContext,
      log
    };
  }

  approveReply(conversationId: string, editedResponse: string) {
    const conversation = this.conversationsService.addMessage(conversationId, "agent", editedResponse);
    const log = this.logs.find((item) => item.conversationId === conversationId && !item.finalResponse);
    if (log) {
      log.agentEditedResponse = editedResponse;
      log.finalResponse = editedResponse;
    }
    return { conversation, log };
  }

  private generateGuardedReply(
    brand: Brand,
    conversation: Conversation,
    retrievedContext: KnowledgeBaseEntry[]
  ): AiSuggestion {
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

    if (/20 days|twenty days|outside|long ago/.test(lower) && /7 days|48 hours/.test(contextText)) {
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
}

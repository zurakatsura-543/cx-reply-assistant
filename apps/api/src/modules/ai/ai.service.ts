import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../../database/database.service";
import { ConversationsService } from "../conversations/conversations.service";
import { KnowledgeBaseService } from "../knowledge-base/knowledge-base.service";
import type { AiLog, AiSuggestion, Brand, Conversation, KnowledgeBaseEntry } from "../../types";

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private logs: AiLog[] = [];

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly knowledgeBaseService: KnowledgeBaseService,
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService
  ) {}

  async generateReply(conversationId: string, _regenerate: boolean) {
    const conversation = await this.conversationsService.getConversation(conversationId);
    const brand = await this.knowledgeBaseService.getBrand(conversation.brandId);
    const latestCustomerMessage = [...conversation.messages]
      .reverse()
      .find((message) => message.sender === "customer");
    const retrievedContext = await this.knowledgeBaseService.retrieveContext(
      brand.id,
      latestCustomerMessage?.text ?? ""
    );
    const providerResult = await this.generateWithProvider(brand, conversation, retrievedContext);
    const suggestion = providerResult.suggestion;

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
      modelName: providerResult.modelName,
      promptTokens: providerResult.promptTokens,
      completionTokens: providerResult.completionTokens,
      createdAt: new Date().toISOString()
    };

    const persistedLog = await this.createLog(log);

    return {
      suggestion,
      retrievedContext,
      log: persistedLog
    };
  }

  async approveReply(conversationId: string, editedResponse: string) {
    const conversation = await this.conversationsService.addMessage(conversationId, "agent", editedResponse);
    const log = await this.approveLatestLog(conversationId, editedResponse);
    return { conversation, log };
  }

  private async createLog(log: AiLog) {
    if (this.databaseService.isEnabled) {
      const result = await this.databaseService.query<{
        id: string;
        conversation_id: string;
        brand_id: string;
        customer_message: string;
        retrieved_context: KnowledgeBaseEntry[];
        ai_generated_response: string;
        agent_edited_response: string | null;
        final_response: string | null;
        confidence: AiSuggestion["confidence"];
        guardrail: string;
        model_name: string | null;
        prompt_tokens: number | null;
        completion_tokens: number | null;
        created_at: string;
      }>(
        `
          insert into ai_response_logs (
            brand_id,
            conversation_id,
            customer_message,
            retrieved_context,
            ai_generated_response,
            confidence,
            guardrail,
            model_name,
            prompt_tokens,
            completion_tokens
          )
          values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10)
          returning
            id,
            conversation_id,
            brand_id,
            customer_message,
            retrieved_context,
            ai_generated_response,
            agent_edited_response,
            final_response,
            confidence,
            guardrail,
            model_name,
            prompt_tokens,
            completion_tokens,
            created_at::text
        `,
        [
          log.brandId,
          log.conversationId,
          log.customerMessage,
          JSON.stringify(log.retrievedContext),
          log.aiGeneratedResponse,
          log.confidence,
          log.guardrail,
          log.modelName,
          log.promptTokens,
          log.completionTokens
        ]
      );
      return this.mapDatabaseLog(result.rows[0]);
    }

    this.logs.unshift(log);
    return log;
  }

  private async approveLatestLog(conversationId: string, editedResponse: string) {
    if (this.databaseService.isEnabled) {
      const result = await this.databaseService.query<{
        id: string;
        conversation_id: string;
        brand_id: string;
        customer_message: string;
        retrieved_context: KnowledgeBaseEntry[];
        ai_generated_response: string;
        agent_edited_response: string | null;
        final_response: string | null;
        confidence: AiSuggestion["confidence"];
        guardrail: string;
        model_name: string | null;
        prompt_tokens: number | null;
        completion_tokens: number | null;
        created_at: string;
      }>(
        `
          update ai_response_logs
          set agent_edited_response = $2,
              final_response = $2
          where id = (
            select id
            from ai_response_logs
            where conversation_id = $1 and final_response is null
            order by created_at desc
            limit 1
          )
          returning
            id,
            conversation_id,
            brand_id,
            customer_message,
            retrieved_context,
            ai_generated_response,
            agent_edited_response,
            final_response,
            confidence,
            guardrail,
            model_name,
            prompt_tokens,
            completion_tokens,
            created_at::text
        `,
        [conversationId, editedResponse]
      );
      return result.rows[0] ? this.mapDatabaseLog(result.rows[0]) : null;
    }

    const log = this.logs.find((item) => item.conversationId === conversationId && !item.finalResponse);
    if (!log) {
      return null;
    }
    log.agentEditedResponse = editedResponse;
    log.finalResponse = editedResponse;
    return log;
  }

  private mapDatabaseLog(row: {
    id: string;
    conversation_id: string;
    brand_id: string;
    customer_message: string;
    retrieved_context: KnowledgeBaseEntry[];
    ai_generated_response: string;
    agent_edited_response: string | null;
    final_response: string | null;
    confidence: AiSuggestion["confidence"];
    guardrail: string;
    model_name?: string | null;
    prompt_tokens?: number | null;
    completion_tokens?: number | null;
    created_at: string;
  }): AiLog {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      brandId: row.brand_id,
      customerMessage: row.customer_message,
      retrievedContext: row.retrieved_context,
      aiGeneratedResponse: row.ai_generated_response,
      agentEditedResponse: row.agent_edited_response,
      finalResponse: row.final_response,
      confidence: row.confidence,
      guardrail: row.guardrail,
      modelName: row.model_name ?? null,
      promptTokens: row.prompt_tokens ?? null,
      completionTokens: row.completion_tokens ?? null,
      createdAt: row.created_at
    };
  }

  private async generateWithProvider(
    brand: Brand,
    conversation: Conversation,
    retrievedContext: KnowledgeBaseEntry[]
  ): Promise<{
    suggestion: AiSuggestion;
    modelName: string | null;
    promptTokens: number | null;
    completionTokens: number | null;
  }> {
    const apiKey = this.configService.get<string>("OPENAI_API_KEY");
    const model = this.configService.get<string>("OPENAI_MODEL");

    if (!apiKey || !model) {
      return {
        suggestion: this.generateGuardedReply(brand, conversation, retrievedContext),
        modelName: null,
        promptTokens: null,
        completionTokens: null
      };
    }

    try {
      const baseUrl = this.configService.get<string>("OPENAI_BASE_URL") || "https://api.openai.com/v1";
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are a CX reply assistant. Use only the provided brand knowledge. Never invent policy. Never promise refund, replacement, cancellation, or compensation unless the provided context supports it. If context is missing or the customer may be ineligible, mark confidence as Needs review and ask for verification. Return only valid JSON with keys: text, confidence, guardrail."
            },
            {
              role: "user",
              content: this.buildPrompt(brand, conversation, retrievedContext)
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`AI provider returned ${response.status}`);
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("AI provider returned an empty response");
      }

      const parsed = JSON.parse(content) as Partial<AiSuggestion>;
      if (!parsed.text || !parsed.confidence || !parsed.guardrail) {
        throw new Error("AI provider returned incomplete JSON");
      }

      return {
        suggestion: {
          text: parsed.text,
          confidence: this.normalizeConfidence(parsed.confidence),
          guardrail: parsed.guardrail
        },
        modelName: model,
        promptTokens: payload.usage?.prompt_tokens ?? null,
        completionTokens: payload.usage?.completion_tokens ?? null
      };
    } catch (error) {
      this.logger.warn(`AI provider failed; using fallback generator. ${(error as Error).message}`);
      return {
        suggestion: this.generateGuardedReply(brand, conversation, retrievedContext),
        modelName: `${model} (fallback used)`,
        promptTokens: null,
        completionTokens: null
      };
    }
  }

  private buildPrompt(brand: Brand, conversation: Conversation, retrievedContext: KnowledgeBaseEntry[]) {
    return JSON.stringify(
      {
        brand: {
          id: brand.id,
          name: brand.name,
          tone: brand.tone
        },
        order: conversation.order,
        conversationHistory: conversation.messages,
        latestCustomerMessage:
          [...conversation.messages].reverse().find((message) => message.sender === "customer")?.text ?? "",
        retrievedKnowledge: retrievedContext.map((entry) => ({
          type: entry.type,
          title: entry.title,
          body: entry.body,
          score: entry.score
        })),
        requiredBehavior: [
          "Write a concise empathetic customer-facing reply.",
          "Ground the answer in retrievedKnowledge only.",
          "Do not mention internal retrieval scores.",
          "If retrievedKnowledge is empty, say the applicable policy needs verification.",
          "If the policy window may be missed, do not promise approval."
        ]
      },
      null,
      2
    );
  }

  private normalizeConfidence(confidence: string): AiSuggestion["confidence"] {
    if (confidence === "High" || confidence === "Medium" || confidence === "Needs review") {
      return confidence;
    }

    return "Needs review";
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

export type PolicyType = "Return policy" | "Refund policy" | "Shipping policy" | "Cancellation policy";

export type KnowledgeBaseEntry = {
  id: string;
  type: PolicyType;
  title: string;
  body: string;
  score?: number;
};

export type Brand = {
  id: string;
  name: string;
  tone: string;
  policies: KnowledgeBaseEntry[];
};

export type MessageSender = "customer" | "agent";

export type Message = {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: string;
};

export type Conversation = {
  id: string;
  customerName: string;
  brandId: string;
  order: {
    orderId: string;
    item: string;
    deliveredAt: string;
    status: string;
    value: string;
  };
  messages: Message[];
};

export type AiSuggestion = {
  confidence: "High" | "Medium" | "Needs review";
  guardrail: string;
  text: string;
};

export type AiLog = {
  id: string;
  conversationId: string;
  brandId: string;
  customerMessage: string;
  retrievedContext: KnowledgeBaseEntry[];
  aiGeneratedResponse: string;
  agentEditedResponse: string | null;
  finalResponse: string | null;
  confidence: AiSuggestion["confidence"];
  guardrail: string;
  modelName?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  createdAt: string;
};

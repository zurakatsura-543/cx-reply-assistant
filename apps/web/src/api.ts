import type { AiSuggestion, Brand, Conversation, KnowledgeBaseEntry, MessageSender, PolicyType } from "./types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export type ApiAiLog = {
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
  modelName: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  createdAt: string;
};

export function getBrands() {
  return request<Brand[]>("/brands");
}

export function getConversations() {
  return request<Conversation[]>("/conversations");
}

export function sendMessage(conversationId: string, sender: MessageSender, text: string) {
  return request<Conversation>(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ sender, text })
  });
}

export function deleteMessage(conversationId: string, messageId: string) {
  return request<Conversation>(`/conversations/${conversationId}/messages/${messageId}`, {
    method: "DELETE"
  });
}

export function createKnowledgeEntry(
  brandId: string,
  entry: { type: PolicyType; title: string; body: string }
) {
  return request<KnowledgeBaseEntry>(`/brands/${brandId}/knowledge`, {
    method: "POST",
    body: JSON.stringify(entry)
  });
}

export function updateKnowledgeEntry(
  brandId: string,
  entryId: string,
  updates: Partial<KnowledgeBaseEntry>
) {
  return request<KnowledgeBaseEntry>(`/brands/${brandId}/knowledge/${entryId}`, {
    method: "PATCH",
    body: JSON.stringify(updates)
  });
}

export function deleteKnowledgeEntry(brandId: string, entryId: string) {
  return request<{ deleted: true }>(`/brands/${brandId}/knowledge/${entryId}`, {
    method: "DELETE"
  });
}

export function generateAiReply(conversationId: string, regenerate: boolean) {
  return request<{
    suggestion: {
      confidence: "High" | "Medium" | "Needs review";
      guardrail: string;
      text: string;
    };
    retrievedContext: KnowledgeBaseEntry[];
    log: ApiAiLog;
  }>(`/conversations/${conversationId}/ai/generate-reply`, {
    method: "POST",
    body: JSON.stringify({ regenerate })
  });
}

export function approveAiReply(conversationId: string, editedResponse: string) {
  return request<{
    conversation: Conversation;
    log: ApiAiLog | null;
  }>(`/conversations/${conversationId}/ai/approve`, {
    method: "POST",
    body: JSON.stringify({ editedResponse })
  });
}

export function getAiLogs(conversationId: string) {
  return request<ApiAiLog[]>(`/conversations/${conversationId}/ai/logs`);
}

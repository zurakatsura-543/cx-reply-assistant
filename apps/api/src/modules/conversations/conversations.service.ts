import { Injectable, NotFoundException } from "@nestjs/common";
import { initialConversations } from "../../seed-data";
import type { Conversation, MessageSender } from "../../types";

@Injectable()
export class ConversationsService {
  private conversations: Conversation[] = structuredClone(initialConversations);

  listConversations() {
    return this.conversations;
  }

  getConversation(conversationId: string) {
    const conversation = this.conversations.find((item) => item.id === conversationId);
    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }
    return conversation;
  }

  addMessage(conversationId: string, sender: MessageSender, text: string) {
    if (!text?.trim()) {
      return this.getConversation(conversationId);
    }

    const conversation = this.getConversation(conversationId);
    conversation.messages.push({
      id: `msg-${Date.now()}`,
      sender,
      text: text.trim(),
      timestamp: new Date().toISOString()
    });
    return conversation;
  }
}

import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { initialConversations } from "../../seed-data";
import type { Conversation, MessageSender } from "../../types";

@Injectable()
export class ConversationsService {
  private conversations: Conversation[] = structuredClone(initialConversations);

  constructor(private readonly databaseService: DatabaseService) {}

  async listConversations() {
    if (this.databaseService.isEnabled) {
      return this.listConversationsFromDatabase();
    }

    return this.conversations;
  }

  async getConversation(conversationId: string) {
    if (this.databaseService.isEnabled) {
      const conversations = await this.listConversationsFromDatabase(conversationId);
      const conversation = conversations[0];
      if (!conversation) {
        throw new NotFoundException("Conversation not found");
      }
      return conversation;
    }

    const conversation = this.conversations.find((item) => item.id === conversationId);
    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }
    return conversation;
  }

  async addMessage(conversationId: string, sender: MessageSender, text: string) {
    if (!text?.trim()) {
      return this.getConversation(conversationId);
    }

    if (this.databaseService.isEnabled) {
      const conversation = await this.getConversation(conversationId);
      await this.databaseService.query(
        `
          insert into messages (brand_id, conversation_id, sender, body)
          values ($1, $2, $3, $4)
        `,
        [conversation.brandId, conversation.id, sender, text.trim()]
      );
      return this.getConversation(conversationId);
    }

    const conversation = await this.getConversation(conversationId);
    conversation.messages.push({
      id: `msg-${Date.now()}`,
      sender,
      text: text.trim(),
      timestamp: new Date().toISOString()
    });
    return conversation;
  }

  async deleteMessage(conversationId: string, messageId: string) {
    const conversation = await this.getConversation(conversationId);
    const message = conversation.messages.find((item) => item.id === messageId);

    if (!message) {
      throw new NotFoundException("Message not found");
    }

    if (this.databaseService.isEnabled) {
      await this.databaseService.query(
        `
          delete from messages
          where conversation_id = $1 and id = $2
        `,
        [conversationId, messageId]
      );
      return this.getConversation(conversationId);
    }

    conversation.messages = conversation.messages.filter((item) => item.id !== messageId);
    return conversation;
  }

  private async listConversationsFromDatabase(conversationId?: string): Promise<Conversation[]> {
    const result = await this.databaseService.query<{
      conversation_id: string;
      brand_id: string;
      customer_name: string;
      external_order_id: string | null;
      item_name: string | null;
      delivered_at: string | null;
      status: string | null;
      order_value: string | null;
      message_id: string | null;
      sender: MessageSender | null;
      body: string | null;
      message_created_at: string | null;
    }>(
      `
        select
          c.id as conversation_id,
          c.brand_id,
          cu.name as customer_name,
          o.external_order_id,
          o.item_name,
          o.delivered_at::text,
          o.status,
          o.order_value::text,
          m.id as message_id,
          m.sender,
          m.body,
          m.created_at::text as message_created_at
        from conversations c
        join customers cu on cu.id = c.customer_id and cu.brand_id = c.brand_id
        left join orders o on o.id = c.order_id and o.brand_id = c.brand_id
        left join messages m on m.conversation_id = c.id and m.brand_id = c.brand_id
        where ($1::uuid is null or c.id = $1::uuid)
        order by c.updated_at desc, m.created_at asc
      `,
      [conversationId ?? null]
    );

    const conversationsById = new Map<string, Conversation>();
    for (const row of result.rows) {
      if (!conversationsById.has(row.conversation_id)) {
        conversationsById.set(row.conversation_id, {
          id: row.conversation_id,
          customerName: row.customer_name,
          brandId: row.brand_id,
          order: {
            orderId: row.external_order_id ?? "N/A",
            item: row.item_name ?? "N/A",
            deliveredAt: row.delivered_at ?? "N/A",
            status: row.status ?? "Unknown",
            value: row.order_value ? `Rs. ${row.order_value}` : "N/A"
          },
          messages: []
        });
      }

      if (row.message_id && row.sender && row.body && row.message_created_at) {
        conversationsById.get(row.conversation_id)?.messages.push({
          id: row.message_id,
          sender: row.sender,
          text: row.body,
          timestamp: row.message_created_at
        });
      }
    }

    return [...conversationsById.values()];
  }
}

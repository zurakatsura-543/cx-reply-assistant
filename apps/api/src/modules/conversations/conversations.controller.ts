import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ConversationsService } from "./conversations.service";
import type { MessageSender } from "../../types";

@Controller("conversations")
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  listConversations() {
    return this.conversationsService.listConversations();
  }

  @Post(":conversationId/messages")
  addMessage(
    @Param("conversationId") conversationId: string,
    @Body() body: { sender: MessageSender; text: string }
  ) {
    return this.conversationsService.addMessage(conversationId, body.sender, body.text);
  }

  @Delete(":conversationId/messages/:messageId")
  deleteMessage(@Param("conversationId") conversationId: string, @Param("messageId") messageId: string) {
    return this.conversationsService.deleteMessage(conversationId, messageId);
  }
}

import { Body, Controller, Get, Param, Post } from "@nestjs/common";
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
}

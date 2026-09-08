import { Body, Controller, Param, Post } from "@nestjs/common";
import { AiService } from "./ai.service";

@Controller("conversations/:conversationId/ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("generate-reply")
  generateReply(@Param("conversationId") conversationId: string, @Body() body: { regenerate?: boolean }) {
    return this.aiService.generateReply(conversationId, body?.regenerate ?? false);
  }

  @Post("approve")
  approveReply(@Param("conversationId") conversationId: string, @Body() body: { editedResponse: string }) {
    return this.aiService.approveReply(conversationId, body.editedResponse);
  }
}

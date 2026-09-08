import { Module } from "@nestjs/common";
import { ConversationsModule } from "../conversations/conversations.module";
import { KnowledgeBaseModule } from "../knowledge-base/knowledge-base.module";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";

@Module({
  imports: [ConversationsModule, KnowledgeBaseModule],
  controllers: [AiController],
  providers: [AiService]
})
export class AiModule {}

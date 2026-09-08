import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AiModule } from "./modules/ai/ai.module";
import { ConversationsModule } from "./modules/conversations/conversations.module";
import { KnowledgeBaseModule } from "./modules/knowledge-base/knowledge-base.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ConversationsModule,
    KnowledgeBaseModule,
    AiModule
  ]
})
export class AppModule {}

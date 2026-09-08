import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./database/database.module";
import { AiModule } from "./modules/ai/ai.module";
import { ConversationsModule } from "./modules/conversations/conversations.module";
import { KnowledgeBaseModule } from "./modules/knowledge-base/knowledge-base.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [".env", "../../.env", "apps/api/.env"],
      isGlobal: true
    }),
    DatabaseModule,
    ConversationsModule,
    KnowledgeBaseModule,
    AiModule
  ]
})
export class AppModule {}

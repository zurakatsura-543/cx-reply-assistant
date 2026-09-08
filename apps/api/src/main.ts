import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.WEB_ORIGIN?.split(",") ?? ["http://localhost:5173", "http://localhost:5174"]
  });
  app.setGlobalPrefix("api");
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}

void bootstrap();

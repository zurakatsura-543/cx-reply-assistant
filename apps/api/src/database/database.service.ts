import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool, QueryResult, QueryResultRow } from "pg";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool | null;

  constructor(private readonly configService: ConfigService) {
    const connectionString = this.configService.get<string>("DATABASE_URL");
    this.pool = connectionString
      ? new Pool({
          connectionString,
          ssl: this.configService.get<string>("DATABASE_SSL") === "true" ? { rejectUnauthorized: false } : false
        })
      : null;
  }

  get isEnabled() {
    return Boolean(this.pool);
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = []
  ): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error("DATABASE_URL is not configured");
    }

    return this.pool.query<T>(text, params);
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }
}

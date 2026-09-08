import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { initialBrands } from "../../seed-data";
import type { Brand, KnowledgeBaseEntry } from "../../types";

const policyKeywords: Record<string, string[]> = {
  "Return policy": ["return", "broken", "damaged", "replace", "replacement", "opened"],
  "Refund policy": ["refund", "money", "paid", "payment", "broken", "damaged"],
  "Shipping policy": ["shipping", "delivered", "dispatch", "ship", "late", "replacement"],
  "Cancellation policy": ["cancel", "cancellation", "change order"]
};

@Injectable()
export class KnowledgeBaseService {
  private brands: Brand[] = structuredClone(initialBrands);

  constructor(private readonly databaseService: DatabaseService) {}

  async listBrands() {
    if (this.databaseService.isEnabled) {
      return this.listBrandsFromDatabase();
    }

    return this.brands;
  }

  async getBrand(brandId: string) {
    if (this.databaseService.isEnabled) {
      const brand = (await this.listBrandsFromDatabase(brandId))[0];
      if (!brand) {
        throw new NotFoundException("Brand not found");
      }
      return brand;
    }

    const brand = this.brands.find((item) => item.id === brandId);
    if (!brand) {
      throw new NotFoundException("Brand not found");
    }
    return brand;
  }

  async retrieveContext(brandId: string, message: string): Promise<KnowledgeBaseEntry[]> {
    const brand = await this.getBrand(brandId);
    const terms = message.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

    return brand.policies
      .map((entry) => {
        const haystack = `${entry.type} ${entry.title} ${entry.body}`.toLowerCase();
        const keywordHits = (policyKeywords[entry.type] || []).filter((word) =>
          message.toLowerCase().includes(word)
        ).length;
        const termHits = terms.filter((term) => term.length > 3 && haystack.includes(term)).length;

        return { ...entry, score: keywordHits * 3 + termHits };
      })
      .filter((entry) => (entry.score ?? 0) > 0)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 3);
  }

  async createEntry(brandId: string, entry: Omit<KnowledgeBaseEntry, "id">) {
    if (this.databaseService.isEnabled) {
      const result = await this.databaseService.query<{
        id: string;
        type: KnowledgeBaseEntry["type"];
        title: string;
        body: string;
      }>(
        `
          insert into knowledge_base_entries (brand_id, type, title, body)
          values ($1, $2, $3, $4)
          returning id, type, title, body
        `,
        [brandId, entry.type, entry.title, entry.body]
      );
      return result.rows[0];
    }

    const brand = await this.getBrand(brandId);
    const created = { id: `kb-${Date.now()}`, ...entry };
    brand.policies.push(created);
    return created;
  }

  async updateEntry(brandId: string, entryId: string, updates: Partial<KnowledgeBaseEntry>) {
    if (this.databaseService.isEnabled) {
      const current = await this.getEntry(brandId, entryId);
      const next = { ...current, ...updates, id: current.id };
      const result = await this.databaseService.query<{
        id: string;
        type: KnowledgeBaseEntry["type"];
        title: string;
        body: string;
      }>(
        `
          update knowledge_base_entries
          set type = $3, title = $4, body = $5, updated_at = now()
          where brand_id = $1 and id = $2
          returning id, type, title, body
        `,
        [brandId, entryId, next.type, next.title, next.body]
      );
      if (!result.rows[0]) {
        throw new NotFoundException("Knowledge base entry not found");
      }
      return result.rows[0];
    }

    const brand = await this.getBrand(brandId);
    const entry = brand.policies.find((item) => item.id === entryId);
    if (!entry) {
      throw new NotFoundException("Knowledge base entry not found");
    }
    Object.assign(entry, updates, { id: entry.id });
    return entry;
  }

  async deleteEntry(brandId: string, entryId: string) {
    if (this.databaseService.isEnabled) {
      await this.databaseService.query(
        `
          delete from knowledge_base_entries
          where brand_id = $1 and id = $2
        `,
        [brandId, entryId]
      );
      return { deleted: true };
    }

    const brand = await this.getBrand(brandId);
    brand.policies = brand.policies.filter((entry) => entry.id !== entryId);
    return { deleted: true };
  }

  private async getEntry(brandId: string, entryId: string) {
    const result = await this.databaseService.query<{
      id: string;
      type: KnowledgeBaseEntry["type"];
      title: string;
      body: string;
    }>(
      `
        select id, type, title, body
        from knowledge_base_entries
        where brand_id = $1 and id = $2
      `,
      [brandId, entryId]
    );

    if (!result.rows[0]) {
      throw new NotFoundException("Knowledge base entry not found");
    }
    return result.rows[0];
  }

  private async listBrandsFromDatabase(brandId?: string): Promise<Brand[]> {
    const result = await this.databaseService.query<{
      brand_id: string;
      brand_name: string;
      tone: string;
      entry_id: string | null;
      type: KnowledgeBaseEntry["type"] | null;
      title: string | null;
      body: string | null;
    }>(
      `
        select
          b.id as brand_id,
          b.name as brand_name,
          b.tone,
          kb.id as entry_id,
          kb.type,
          kb.title,
          kb.body
        from brands b
        left join knowledge_base_entries kb
          on kb.brand_id = b.id and kb.is_active = true
        where ($1::uuid is null or b.id = $1::uuid)
        order by b.name asc, kb.type asc, kb.created_at asc
      `,
      [brandId ?? null]
    );

    const brandsById = new Map<string, Brand>();
    for (const row of result.rows) {
      if (!brandsById.has(row.brand_id)) {
        brandsById.set(row.brand_id, {
          id: row.brand_id,
          name: row.brand_name,
          tone: row.tone,
          policies: []
        });
      }

      if (row.entry_id && row.type && row.title && row.body) {
        brandsById.get(row.brand_id)?.policies.push({
          id: row.entry_id,
          type: row.type,
          title: row.title,
          body: row.body
        });
      }
    }

    return [...brandsById.values()];
  }
}

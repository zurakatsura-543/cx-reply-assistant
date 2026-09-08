import { Injectable, NotFoundException } from "@nestjs/common";
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

  listBrands() {
    return this.brands;
  }

  getBrand(brandId: string) {
    const brand = this.brands.find((item) => item.id === brandId);
    if (!brand) {
      throw new NotFoundException("Brand not found");
    }
    return brand;
  }

  retrieveContext(brandId: string, message: string): KnowledgeBaseEntry[] {
    const brand = this.getBrand(brandId);
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

  createEntry(brandId: string, entry: Omit<KnowledgeBaseEntry, "id">) {
    const brand = this.getBrand(brandId);
    const created = { id: `kb-${Date.now()}`, ...entry };
    brand.policies.push(created);
    return created;
  }

  updateEntry(brandId: string, entryId: string, updates: Partial<KnowledgeBaseEntry>) {
    const brand = this.getBrand(brandId);
    const entry = brand.policies.find((item) => item.id === entryId);
    if (!entry) {
      throw new NotFoundException("Knowledge base entry not found");
    }
    Object.assign(entry, updates, { id: entry.id });
    return entry;
  }

  deleteEntry(brandId: string, entryId: string) {
    const brand = this.getBrand(brandId);
    brand.policies = brand.policies.filter((entry) => entry.id !== entryId);
    return { deleted: true };
  }
}

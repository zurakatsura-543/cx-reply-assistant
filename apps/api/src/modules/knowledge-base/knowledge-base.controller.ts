import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { KnowledgeBaseService } from "./knowledge-base.service";
import type { KnowledgeBaseEntry, PolicyType } from "../../types";

@Controller("brands")
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Get()
  listBrands() {
    return this.knowledgeBaseService.listBrands();
  }

  @Post(":brandId/knowledge")
  createEntry(
    @Param("brandId") brandId: string,
    @Body() body: { type: PolicyType; title: string; body: string }
  ) {
    return this.knowledgeBaseService.createEntry(brandId, body);
  }

  @Patch(":brandId/knowledge/:entryId")
  updateEntry(
    @Param("brandId") brandId: string,
    @Param("entryId") entryId: string,
    @Body() body: Partial<KnowledgeBaseEntry>
  ) {
    return this.knowledgeBaseService.updateEntry(brandId, entryId, body);
  }

  @Delete(":brandId/knowledge/:entryId")
  deleteEntry(@Param("brandId") brandId: string, @Param("entryId") entryId: string) {
    return this.knowledgeBaseService.deleteEntry(brandId, entryId);
  }
}

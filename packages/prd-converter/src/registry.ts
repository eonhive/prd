/**
 * Company: EonHive Inc. | Title: PRD Import Adapter Registry
 * Purpose: Select one detected adapter without relying on registration order.
 * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27
 * Notes: Vibe coded with Codex.
 */
import type { ImportAdapter, ImportSource } from "./contracts.js";

export class ImportAdapterRegistry {
  private readonly adapters = new Map<string, ImportAdapter>();

  register(adapter: ImportAdapter): this {
    if (!/^[a-z][a-z0-9-]*$/u.test(adapter.id) || this.adapters.has(adapter.id)) {
      throw new Error(`Invalid or duplicate import adapter id: ${adapter.id}`);
    }
    this.adapters.set(adapter.id, adapter);
    return this;
  }

  async detect(source: ImportSource): Promise<ImportAdapter> {
    const matches: ImportAdapter[] = [];
    for (const adapter of this.adapters.values()) {
      if (await adapter.detect(source)) matches.push(adapter);
    }
    if (matches.length !== 1) {
      throw new Error(matches.length === 0
        ? `Unsupported source format: ${source.name}`
        : `Ambiguous source format: ${matches.map((adapter) => adapter.id).join(", ")}`);
    }
    return matches[0]!;
  }
}

/**
 * Company: EonHive Inc. | Title: Conversion Limits
 * Purpose: Share conversion budgets without filesystem dependencies.
 * Author: Stan Nesi | Created: 2026-10-28 | Updated: 2026-10-28
 * Notes: Vibe coded with Codex.
 */
import type { ConversionLimits } from "./contracts.js";

export const DEFAULT_CONVERSION_LIMITS: Readonly<ConversionLimits> = Object.freeze({
  maxInputBytes: 4 * 1024 * 1024,
  maxResourceBytes: 8 * 1024 * 1024,
  maxTotalResourceBytes: 24 * 1024 * 1024,
  maxResources: 128,
  maxNodes: 20_000
});

export function resolveConversionLimits(overrides: Partial<ConversionLimits> = {}): ConversionLimits {
  const limits = { ...DEFAULT_CONVERSION_LIMITS, ...overrides };
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new RangeError(`${name} must be a positive safe integer.`);
  }
  return limits;
}

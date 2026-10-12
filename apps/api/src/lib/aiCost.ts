// Rates are configured in micro-USD per million tokens, never hardcoded provider prices.
// Round upward to avoid undercounting fractional micro-USD. No floating-point money.
export function aiCostMicroUsd(inputTokens: number, outputTokens: number, inputRate: number, outputRate: number): number {
  for (const value of [inputTokens, outputTokens, inputRate, outputRate]) {
    if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000_000) throw new Error('AI_INVALID_COST_INPUT');
  }
  const numerator = BigInt(inputTokens) * BigInt(inputRate) + BigInt(outputTokens) * BigInt(outputRate);
  const total = (numerator + 999999n) / 1000000n;
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('AI_COST_OVERFLOW');
  return Number(total);
}
export function canReserveAiCost(limit: number, spent: number, reserved: number, next: number) {
  for (const value of [limit, spent, reserved, next]) if (!Number.isSafeInteger(value) || value < 0) throw new Error('AI_INVALID_BUDGET');
  return BigInt(spent) + BigInt(reserved) + BigInt(next) <= BigInt(limit);
}

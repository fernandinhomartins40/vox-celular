import { aiCostMicroUsd } from './aiCost.js';
import { reserveAiBudget, settleAiBudget } from './aiBudget.js';
import { callRecommendationProvider, type AiProviderConfig } from './aiProvider.js';
import { recommendationSchema, type Candidate } from './recommendations.js';

type BudgetConfig = { monthlyLimitMicroUsd: number; inputRateMicroUsd: number; outputRateMicroUsd: number };
type Dependencies = {
  reserve: typeof reserveAiBudget;
  settle: typeof settleAiBudget;
  call: typeof callRecommendationProvider;
};
// Internal orchestration only. HTTP activation must load trusted tenant configuration,
// verify external-processing notice and never accept budget/rates/keys from public input.
export async function budgetedRecommendation(provider: AiProviderConfig, budget: BudgetConfig, input: unknown, products: Candidate[], dependencies: Dependencies = { reserve: reserveAiBudget, settle: settleAiBudget, call: callRecommendationProvider }) {
  const needs = recommendationSchema.parse(input);
  const maximum = aiCostMicroUsd(100000, 512, budget.inputRateMicroUsd, budget.outputRateMicroUsd);
  const month = new Date().toISOString().slice(0, 7);
  const reservation = await dependencies.reserve(needs.lojaId, month, budget.monthlyLimitMicroUsd, maximum);
  let response: Awaited<ReturnType<typeof callRecommendationProvider>>;
  try { response = await dependencies.call(provider, needs, products); }
  catch {
    await dependencies.settle(needs.lojaId, reservation.id);
    throw new Error('AI_PROVIDER_UNAVAILABLE');
  }
  const cost = aiCostMicroUsd(response.inputTokens, response.outputTokens, budget.inputRateMicroUsd, budget.outputRateMicroUsd);
  await dependencies.settle(needs.lojaId, reservation.id, cost);
  return { ...response, costMicroUsd: cost };
}

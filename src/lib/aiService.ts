/**
 * AI Verdict Service
 * 
 * Calls the Vercel Serverless Function at /api/ai-verdict to get
 * a Gemini-powered analysis of the product pricing.
 * 
 * - Timeout: 10 seconds
 * - Fallback: returns null on any error (silent failure)
 * - The API key is NEVER exposed to the frontend
 */

export interface AIVerdictResult {
  verdict: 'VALE A PENA' | 'PODE MELHORAR' | 'NÃO VALE A PENA' | string;
  summary: string;
  tips: string[];
  action_plan: string;
}

export interface AIVerdictPayload {
  name: string;
  cost: number;
  packaging_cost: number;
  final_price: number;
  liquido_ml: number;
  net_profit: number;
  margin_percentage: number;
  margin_target: number;
  roi: number;
  commission_rate: number;
  commission_amount: number;
  shipping_cost: number;
  fixed_fee: number;
  tax_amount: number;
  ads_amount: number;
  total_deductions: number;
  competitor_price: number;
  mode: string;
  tax_regime: string;
  weight: number;
  break_even_price: number;
  units_to_goal: number;
}

/**
 * Fetches the AI verdict from the serverless function.
 * Returns null on any error (timeout, network, parsing) — silent fallback.
 */
export async function fetchAIVerdict(data: AIVerdictPayload): Promise<AIVerdictResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch('/api/ai-verdict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn('[AI] API returned status', response.status);
      return null;
    }

    const result: AIVerdictResult = await response.json();

    // Validate minimum structure
    if (!result.verdict || !result.summary) {
      console.warn('[AI] Invalid response structure:', result);
      return null;
    }

    // Ensure tips is always an array
    if (!Array.isArray(result.tips)) {
      result.tips = [];
    }

    return result;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn('[AI] Request timed out after 10s');
    } else {
      console.warn('[AI] Request failed:', error.message);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

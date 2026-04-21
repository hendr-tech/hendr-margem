import { ML_CONFIG, getShippingCost, AdTypeKey, ShippingMethod, TaxRegime } from '../config/mlConfig';

export interface PricingInput {
  name: string;
  cost: number;
  weight: number;
  packaging_cost: number;
  tax_rate: number;
  tax_regime: TaxRegime;
  ads_rate: number;
  margin_target: number;
  ad_type: AdTypeKey;
  shipping_method: ShippingMethod;
  competitor_price: number;
  manual_price?: number;
  monthly_goal?: number;
}

export interface FeedbackResult {
  verdict: 'worth_it' | 'marginal' | 'not_worth_it' | 'impossible';
  title: string;
  message: string;
  max_cost_for_target: number;
  ideal_cost_range: { min: number; max: number } | null;
}

export interface PricingResult {
  final_price: number;
  liquido_ml: number;       // Preço - Comissão - Frete - Taxa Fixa
  net_profit: number;       // Líquido ML - Custo - Impostos - Embalagem
  commission_amount: number;
  commission_rate: number;
  shipping_cost: number;
  fixed_fee: number;
  tax_amount: number;
  ads_amount: number;
  total_deductions: number;
  margin_percentage: number;
  is_below_threshold: boolean;
  break_even_price: number;
  units_to_goal: number;
  roi: number;
  cost: number;
  packaging_cost: number;
  mode: 'suggestion' | 'simulation';
  feedback: FeedbackResult;
  competitiveness: {
    is_competitive: boolean;
    price_diff: number;
    suggestion: string;
    status: 'excellent' | 'good' | 'warning' | 'danger';
  };
}

/**
 * Calculates complete ML pricing with accurate fee structure
 * 
 * FÓRMULA DO MERCADO LIVRE:
 * 
 * Custos_Absolutos = Custo_Produto + Custo_Embalagem + Custo_Frete_Vendedor (se ≥ R$79) + Tarifa_Fixa_ML (se < R$79)
 * Divisor = 1 - (Comissao_ML_PCT + Imposto_PCT + Margem_Lucro_Desejada_PCT + Ads_PCT)
 * Preço_de_Venda_Sugerido = Custos_Absolutos / Divisor
 * 
 * VERIFICAÇÃO CRÍTICA DA BARREIRA R$ 79:
 * - Se preço < R$ 79: comprador paga frete, vendedor paga R$ 6,25 taxa fixa
 * - Se preço ≥ R$ 79: vendedor paga frete, sem taxa fixa
 * - O preço sugerido pode "cruzar" essa barreira, exigindo recálculo
 * 
 * LOOP DE PRECIFICAÇÃO (Convergência):
 * O custo do frete depende da faixa de preço, que por sua vez depende do frete.
 * Utilizamos iteração até que o preço convirja (diferença < R$ 0,01),
 * garantindo que o preço final absorva o custo correto de frete da sua faixa.
 * 
 * MODO SUGESTÃO: Calcula o preço ideal dado um custo e margem desejada
 * MODO SIMULAÇÃO: Dado um preço de venda, calcula o lucro real
 */
export const calculatePricing = (input: PricingInput): PricingResult => {
  const {
    cost, weight, packaging_cost, tax_rate, tax_regime,
    ads_rate, margin_target, ad_type, shipping_method,
    competitor_price, manual_price, monthly_goal = 0
  } = input;

  // ═══════════════════════════════════════════
  // REGIME FISCAL: Determinar alíquota efetiva
  // ═══════════════════════════════════════════
  const effective_tax_rate = tax_regime === 'CPF_MEI' ? 0 : tax_rate;

  const commission_rate = ML_CONFIG.AD_TYPES[ad_type].rate;
  let final_price = 0;
  let mode: 'suggestion' | 'simulation' = 'suggestion';
  let is_impossible = false;

  if (manual_price && manual_price > 0) {
    // ═══════════════════════════════════════════
    // MODO SIMULAÇÃO: Preço já definido pelo usuário
    // ═══════════════════════════════════════════
    final_price = manual_price;
    mode = 'simulation';
  } else {
    // ═══════════════════════════════════════════
    // MODO SUGESTÃO: Calcular preço ideal via Markup
    // ═══════════════════════════════════════════
    // Fórmula: Preço = Custos_Absolutos / Divisor
    // Divisor = 1 - (Comissão% + Imposto% + Margem% + Ads%)

    const divisor = 1 - commission_rate - effective_tax_rate - margin_target - ads_rate;

    if (divisor <= 0) {
      // Margem + taxas excedem 100% — impossível precificar
      is_impossible = true;
      final_price = 0;
    } else {
      // ─── CÁLCULO COM VERIFICAÇÃO DA BARREIRA R$ 79 ─────────────
      // 
      // Estratégia: calcular duas versões do preço e escolher a correta.
      //
      // Cenário A: Preço abaixo de R$ 79 (sem frete, com taxa fixa R$ 6,25)
      // Cenário B: Preço acima de R$ 79 (com frete por peso, sem taxa fixa)
      //
      // Depois verificar qual cenário é consistente.

      // Cenário A: Preço < R$ 79 (comprador paga frete, vendedor paga taxa fixa)
      const custos_abaixo = cost + packaging_cost + ML_CONFIG.FIXED_FEE_AMOUNT; // +R$6,25 taxa fixa, sem frete
      const preco_abaixo = custos_abaixo / divisor;

      // ─── CENÁRIO B: PREÇO ≥ R$ 79 COM LOOP DE CONVERGÊNCIA ─────
      // 
      // O frete depende da faixa de preço, e a faixa de preço depende
      // do frete. Iteramos até convergir:
      //   1. Estimar preço sem frete
      //   2. Buscar frete para essa faixa de preço
      //   3. Recalcular preço com o frete encontrado
      //   4. Repetir até estabilizar (|preço_n - preço_n-1| < 0.01)
      //
      // Máximo de 20 iterações como safety net (converge em ~3-5).
      let preco_acima = (cost + packaging_cost) / divisor; // Estimativa inicial sem frete
      let prevPrice = 0;

      for (let i = 0; i < 20; i++) {
        const shipping = getShippingCost(weight, preco_acima, shipping_method);
        const custos_acima = cost + packaging_cost + shipping; // sem taxa fixa, com frete
        preco_acima = custos_acima / divisor;

        // Convergiu — o preço não muda mais e o frete está correto para a faixa
        if (Math.abs(preco_acima - prevPrice) < 0.01) break;
        prevPrice = preco_acima;
      }

      // ─── ESCOLHER O CENÁRIO CORRETO ─────────────────────────────
      // O preço calculado deve ser consistente com a estrutura de custos usada.
      if (preco_abaixo < ML_CONFIG.FIXED_FEE_THRESHOLD) {
        // Cenário A é consistente: preço ficou abaixo de R$ 79
        final_price = preco_abaixo;
      } else if (preco_acima >= ML_CONFIG.FIXED_FEE_THRESHOLD) {
        // Cenário B é consistente: preço ficou acima de R$ 79
        final_price = preco_acima;
      } else {
        // Ambos os cenários são inconsistentes (caso raro na barreira).
        // O preço "abaixo" cruzou pra cima, e o preço "acima" caiu pra baixo.
        // Neste caso, usar o cenário B (acima de R$ 79) pois é mais vantajoso
        // para o comprador (frete grátis = mais vendas).
        final_price = Math.max(preco_acima, ML_CONFIG.FIXED_FEE_THRESHOLD);

        // Recalcular com loop de convergência para este preço forçado acima de R$ 79
        for (let i = 0; i < 20; i++) {
          const finalShipping = getShippingCost(weight, final_price, shipping_method);
          const newPrice = (cost + packaging_cost + finalShipping) / divisor;
          if (Math.abs(newPrice - final_price) < 0.01) {
            final_price = newPrice;
            break;
          }
          final_price = newPrice;
        }
        // Garantir que não caiu abaixo de R$ 79
        final_price = Math.max(final_price, ML_CONFIG.FIXED_FEE_THRESHOLD);
      }
    }
  }

  // ═══════════════════════════════════════════
  // CÁLCULOS DE RESULTADO
  // ═══════════════════════════════════════════

  const is_below_threshold = final_price < ML_CONFIG.FIXED_FEE_THRESHOLD;
  const fixed_fee = is_below_threshold ? ML_CONFIG.FIXED_FEE_AMOUNT : 0;
  const shipping_cost = getShippingCost(weight, final_price, shipping_method);

  // Deduções do ML (o que o ML tira)
  const commission_amount = final_price * commission_rate;

  // Líquido ML = o que cai na sua conta do ML
  const liquido_ml = final_price - commission_amount - shipping_cost - fixed_fee;

  // Deduções do vendedor (custos operacionais)
  // IMPOSTO INCIDE SOBRE O PREÇO FINAL DE VENDA
  const tax_amount = final_price * effective_tax_rate;
  const ads_amount = final_price * ads_rate;

  // Lucro Real = Líquido ML - Custo - Impostos - Embalagem - Ads
  const net_profit = liquido_ml - cost - tax_amount - ads_amount - packaging_cost;

  // Total de deduções
  const total_deductions = commission_amount + shipping_cost + fixed_fee + tax_amount + ads_amount + cost + packaging_cost;

  // Métricas
  const margin_percentage = final_price > 0 ? (net_profit / final_price) * 100 : 0;
  const roi = (cost + packaging_cost) > 0 ? (net_profit / (cost + packaging_cost)) * 100 : 0;
  const units_to_goal = net_profit > 0 ? Math.ceil(monthly_goal / net_profit) : 0;

  // Ponto de equilíbrio (margem = 0, ads = 0) com loop de convergência
  const be_divisor = 1 - commission_rate - effective_tax_rate;
  let break_even_price = 0;
  if (be_divisor > 0) {
    break_even_price = (cost + packaging_cost) / be_divisor;
    for (let i = 0; i < 20; i++) {
      const beShipping = getShippingCost(weight, break_even_price, shipping_method);
      const beFee = break_even_price < ML_CONFIG.FIXED_FEE_THRESHOLD ? ML_CONFIG.FIXED_FEE_AMOUNT : 0;
      const newBE = (cost + beShipping + beFee + packaging_cost) / be_divisor;
      if (Math.abs(newBE - break_even_price) < 0.01) {
        break_even_price = newBE;
        break;
      }
      break_even_price = newBE;
    }
  }

  // ═══════════════════════════════════════════
  // ANÁLISE DE COMPETITIVIDADE (antes do feedback, para influenciar veredito)
  // ═══════════════════════════════════════════
  let comp_status: 'excellent' | 'good' | 'warning' | 'danger' = 'good';
  let comp_suggestion = '';
  const price_diff = competitor_price > 0 ? ((final_price - competitor_price) / competitor_price) * 100 : 0;

  if (competitor_price > 0) {
    if (competitor_price <= cost) {
      comp_status = 'danger';
      comp_suggestion = `🚨 ALERTA CRÍTICO: O concorrente vende a R$ ${fmt(competitor_price)}, que é MENOR que seu custo de R$ ${fmt(cost)}. É praticamente impossível competir nesse preço. Você precisa de um fornecedor com custo abaixo de R$ ${fmt(competitor_price * 0.5)} para ter chance, ou buscar um diferencial que justifique o preço maior (kit, brindes, garantia estendida).`;
    } else if (final_price <= competitor_price * 0.95) {
      comp_status = 'excellent';
      comp_suggestion = 'Preço excelente! Você tem margem competitiva para dominar esse nicho.';
    } else if (final_price <= competitor_price * 1.05) {
      comp_status = 'good';
      comp_suggestion = 'Preço competitivo. Foque na qualidade do anúncio e velocidade de entrega.';
    } else if (final_price <= competitor_price * 1.15) {
      comp_status = 'warning';
      comp_suggestion = 'Preço um pouco acima. Considere negociar com fornecedor ou reduzir margem.';
    } else {
      comp_status = 'danger';
      comp_suggestion = `Preço ${((final_price / competitor_price - 1) * 100).toFixed(0)}% acima do concorrente. Muito difícil vender nesse valor. Revise custos ou considere outro fornecedor.`;
    }
  }

  // ═══════════════════════════════════════════
  // FEEDBACK INTELIGENTE (3 NÍVEIS + COMPETITIVIDADE)
  // ═══════════════════════════════════════════

  const feedback = generateFeedback({
    net_profit,
    margin_percentage,
    margin_target,
    cost,
    packaging_cost,
    final_price,
    commission_rate,
    effective_tax_rate,
    ads_rate,
    weight,
    shipping_method,
    is_impossible,
    mode,
    competitor_price,
    comp_status,
  });

  return {
    final_price,
    liquido_ml,
    net_profit,
    commission_amount,
    commission_rate,
    shipping_cost,
    fixed_fee,
    tax_amount,
    ads_amount,
    total_deductions,
    margin_percentage,
    is_below_threshold,
    break_even_price,
    units_to_goal,
    roi,
    cost,
    packaging_cost,
    mode,
    feedback,
    competitiveness: {
      is_competitive: final_price <= competitor_price * 1.05 || competitor_price === 0,
      price_diff,
      suggestion: comp_suggestion,
      status: comp_status,
    },
  };
};

// ═══════════════════════════════════════════
// GERADOR DE FEEDBACK INTELIGENTE
// ═══════════════════════════════════════════

interface FeedbackParams {
  net_profit: number;
  margin_percentage: number;
  margin_target: number;
  cost: number;
  packaging_cost: number;
  final_price: number;
  commission_rate: number;
  effective_tax_rate: number;
  ads_rate: number;
  weight: number;
  shipping_method: ShippingMethod;
  is_impossible: boolean;
  mode: 'suggestion' | 'simulation';
  competitor_price: number;
  comp_status: 'excellent' | 'good' | 'warning' | 'danger';
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function generateFeedback(params: FeedbackParams): FeedbackResult {
  const {
    net_profit, margin_percentage, margin_target, cost, packaging_cost,
    final_price, commission_rate, effective_tax_rate, ads_rate,
    weight, shipping_method, is_impossible, mode,
    competitor_price, comp_status,
  } = params;

  const margin_target_pct = margin_target * 100;

  // Caso especial: divisor impossível
  if (is_impossible) {
    return {
      verdict: 'impossible',
      title: 'Margem Impossível ⛔',
      message: `A soma da comissão (${(commission_rate * 100).toFixed(0)}%), imposto (${(effective_tax_rate * 100).toFixed(1)}%), margem (${margin_target_pct.toFixed(0)}%) e ads (${(ads_rate * 100).toFixed(0)}%) ultrapassa 100%. É matematicamente impossível precificar. Reduza a margem desejada ou os custos percentuais.`,
      max_cost_for_target: 0,
      ideal_cost_range: null,
    };
  }

  // Calcular o custo máximo que permitiria atingir a margem desejada
  // A partir do preço final atual, qual o máximo que poderia pagar pelo produto?
  const max_cost = calculateMaxCostForMargin(
    final_price, commission_rate, effective_tax_rate, ads_rate,
    margin_target, packaging_cost, weight, shipping_method
  );

  if (net_profit <= 0) {
    // ─── NÃO VALE A PENA ─────────────────────────────────
    const break_even_cost = calculateMaxCostForMargin(
      final_price, commission_rate, effective_tax_rate, ads_rate,
      0, packaging_cost, weight, shipping_method
    );

    return {
      verdict: 'not_worth_it',
      title: 'Não Vale a Pena ❌',
      message: mode === 'simulation'
        ? `Com esse preço de venda (R$ ${fmt(final_price)}), você tem prejuízo de R$ ${fmt(Math.abs(net_profit))} por unidade. Para ter lucro zero nesse preço, seu custo máximo deveria ser R$ ${fmt(Math.max(0, break_even_cost))}. Para atingir ${margin_target_pct.toFixed(0)}% de margem, o custo máximo seria R$ ${fmt(Math.max(0, max_cost))}.`
        : `Resultado negativo. Para atingir sua meta de ${margin_target_pct.toFixed(0)}% de margem, você precisaria de um custo máximo de R$ ${fmt(Math.max(0, max_cost))}. Seu custo atual de R$ ${fmt(cost)} é muito alto para essa operação.`,
      max_cost_for_target: Math.max(0, max_cost),
      ideal_cost_range: { min: 0, max: Math.max(0, break_even_cost) },
    };
  }

  if (margin_percentage < margin_target_pct - 0.1) {
    // ─── PODE MELHORAR (lucro positivo mas abaixo da meta) ─
    const ideal_min = max_cost * 0.85; // faixa confortável
    const ideal_max = max_cost;

    return {
      verdict: 'marginal',
      title: 'Pode Melhorar ⚠️',
      message: `O produto dá lucro (R$ ${fmt(net_profit)}/un), mas a margem de ${margin_percentage.toFixed(1)}% está abaixo da sua meta de ${margin_target_pct.toFixed(0)}%. Para atingir ${margin_target_pct.toFixed(0)}%, seu custo deveria estar entre R$ ${fmt(Math.max(0, ideal_min))} e R$ ${fmt(Math.max(0, ideal_max))}. Seu custo atual é R$ ${fmt(cost)}.`,
      max_cost_for_target: Math.max(0, max_cost),
      ideal_cost_range: { min: Math.max(0, ideal_min), max: Math.max(0, ideal_max) },
    };
  }

  // ─── VALE A PENA ✅ (verificar competitividade) ──────

  // Se concorrente vende ABAIXO do seu custo → rebaixar para "marginal"
  if (competitor_price > 0 && competitor_price <= cost) {
    return {
      verdict: 'marginal',
      title: 'Lucrativo, mas Inviável ⚠️',
      message: `Matematicamente o produto dá lucro de R$ ${fmt(net_profit)}/un (${margin_percentage.toFixed(1)}% de margem). MAS o concorrente vende a R$ ${fmt(competitor_price)}, que é menor que seu custo de R$ ${fmt(cost)}. Seu preço de R$ ${fmt(final_price)} ficaria ${((final_price / competitor_price - 1) * 100).toFixed(0)}% acima. É quase impossível vender assim. Busque um fornecedor com custo abaixo de R$ ${fmt(competitor_price * 0.5)} ou crie um diferencial (kit, brinde, garantia).`,
      max_cost_for_target: Math.max(0, max_cost),
      ideal_cost_range: { min: 0, max: Math.max(0, competitor_price * 0.5) },
    };
  }

  // Se preço muito acima do concorrente (>15%) → rebaixar para "marginal"
  if (competitor_price > 0 && comp_status === 'danger') {
    return {
      verdict: 'marginal',
      title: 'Lucrativo, mas Caro ⚠️',
      message: `Margem de ${margin_percentage.toFixed(1)}% atingida (R$ ${fmt(net_profit)}/un), porém seu preço de R$ ${fmt(final_price)} está ${((final_price / competitor_price - 1) * 100).toFixed(0)}% acima do concorrente (R$ ${fmt(competitor_price)}). Vai ser difícil vender. Tente negociar o custo ou reduzir a margem para se aproximar do concorrente.`,
      max_cost_for_target: Math.max(0, max_cost),
      ideal_cost_range: null,
    };
  }

  return {
    verdict: 'worth_it',
    title: 'Vale a Pena! ✅',
    message: competitor_price > 0 && comp_status === 'excellent'
      ? `Margem de ${margin_percentage.toFixed(1)}% atingida! Lucro de R$ ${fmt(net_profit)}/un com ROI de ${((net_profit / (cost + packaging_cost)) * 100).toFixed(0)}%. E o melhor: seu preço está ABAIXO do concorrente. Operação excelente!`
      : `Margem de ${margin_percentage.toFixed(1)}% atingida! Lucro de R$ ${fmt(net_profit)} por unidade com ROI de ${((net_profit / (cost + packaging_cost)) * 100).toFixed(0)}%. Operação saudável.`,
    max_cost_for_target: Math.max(0, max_cost),
    ideal_cost_range: null,
  };
}

/**
 * Calcula o custo máximo do produto que atinge uma margem desejada
 * dado o preço de venda final.
 * 
 * Lucro = Preço - Comissão - Frete - TaxaFixa - Imposto - Ads - Custo - Embalagem
 * Margem = Lucro / Preço
 * 
 * Resolvendo para Custo:
 * Custo_max = Preço × (1 - Comissão% - Imposto% - Ads% - Margem%) - Frete - TaxaFixa - Embalagem
 */
function calculateMaxCostForMargin(
  final_price: number,
  commission_rate: number,
  tax_rate: number,
  ads_rate: number,
  target_margin: number,
  packaging_cost: number,
  weight: number,
  shipping_method: ShippingMethod,
): number {
  const is_below = final_price < ML_CONFIG.FIXED_FEE_THRESHOLD;
  const fixed_fee = is_below ? ML_CONFIG.FIXED_FEE_AMOUNT : 0;
  const shipping = getShippingCost(weight, final_price, shipping_method);

  return final_price * (1 - commission_rate - tax_rate - ads_rate - target_margin)
    - shipping - fixed_fee - packaging_cost;
}

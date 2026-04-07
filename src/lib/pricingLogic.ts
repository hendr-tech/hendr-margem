import { ML_CONFIG, getShippingCost, AdTypeKey, ShippingMethod } from '../config/mlConfig';

export interface PricingInput {
  name: string;
  cost: number;
  weight: number;
  packaging_cost: number;
  tax_rate: number;
  ads_rate: number;
  margin_target: number;
  ad_type: AdTypeKey;
  shipping_method: ShippingMethod;
  competitor_price: number;
  manual_price?: number;
  monthly_goal?: number;
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
 * Líquido ML = Preço de Venda - Comissão - Frete (vendedor) - Taxa Fixa
 * Lucro Real  = Líquido ML - Custo Produto - Impostos - Embalagem - Ads
 * 
 * MODO SUGESTÃO: Calcula o preço ideal dado um custo e margem desejada
 * MODO SIMULAÇÃO: Dado um preço de venda, calcula o lucro real
 */
export const calculatePricing = (input: PricingInput): PricingResult => {
  const {
    cost, weight, packaging_cost, tax_rate, ads_rate,
    margin_target, ad_type, shipping_method, competitor_price,
    manual_price, monthly_goal = 0
  } = input;

  const commission_rate = ML_CONFIG.AD_TYPES[ad_type].rate;
  let final_price = 0;
  let mode: 'suggestion' | 'simulation' = 'suggestion';

  if (manual_price && manual_price > 0) {
    // ═══════════════════════════════════════════
    // MODO SIMULAÇÃO: Preço já definido pelo usuário
    // ═══════════════════════════════════════════
    final_price = manual_price;
    mode = 'simulation';
  } else {
    // ═══════════════════════════════════════════
    // MODO SUGESTÃO: Calcular preço ideal
    // ═══════════════════════════════════════════
    // Fórmula: Price = (Custo + Frete + TaxaFixa + Embalagem) / (1 - %Comissão - %Imposto - %Margem - %Ads)
    // 
    // Como o frete depende do preço final, usamos iteração:
    // 1. Calcular preço sem frete
    // 2. Determinar frete baseado no preço
    // 3. Recalcular preço com frete
    // 4. Repetir até estabilizar

    const divisor = 1 - commission_rate - tax_rate - margin_target - ads_rate;
    
    if (divisor <= 0) {
      // Margem + taxas excedem 100% - impossível
      final_price = 0;
    } else {
      // Iteração para estabilizar o preço (máx 10 tentativas)
      let prevPrice = 0;
      final_price = (cost + packaging_cost) / divisor; // Estimativa inicial sem frete

      for (let i = 0; i < 10; i++) {
        const shipping = getShippingCost(weight, final_price, shipping_method);
        const fixedFee = final_price < ML_CONFIG.FIXED_FEE_THRESHOLD ? ML_CONFIG.FIXED_FEE_AMOUNT : 0;
        
        final_price = (cost + shipping + fixedFee + packaging_cost) / divisor;
        
        // Convergiu
        if (Math.abs(final_price - prevPrice) < 0.01) break;
        prevPrice = final_price;
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
  const tax_amount = final_price * tax_rate;
  const ads_amount = final_price * ads_rate;

  // Lucro Real = Líquido ML - Custo - Impostos - Embalagem - Ads
  const net_profit = liquido_ml - cost - tax_amount - ads_amount - packaging_cost;

  // Total de deduções
  const total_deductions = commission_amount + shipping_cost + fixed_fee + tax_amount + ads_amount + cost + packaging_cost;

  // Métricas
  const margin_percentage = final_price > 0 ? (net_profit / final_price) * 100 : 0;
  const roi = (cost + packaging_cost) > 0 ? (net_profit / (cost + packaging_cost)) * 100 : 0;
  const units_to_goal = net_profit > 0 ? Math.ceil(monthly_goal / net_profit) : 0;

  // Ponto de equilíbrio (margem = 0, ads = 0)
  const be_divisor = 1 - commission_rate - tax_rate;
  let break_even_price = 0;
  if (be_divisor > 0) {
    // Iteração para break-even também
    break_even_price = (cost + packaging_cost) / be_divisor;
    for (let i = 0; i < 5; i++) {
      const beShipping = getShippingCost(weight, break_even_price, shipping_method);
      const beFee = break_even_price < ML_CONFIG.FIXED_FEE_THRESHOLD ? ML_CONFIG.FIXED_FEE_AMOUNT : 0;
      break_even_price = (cost + beShipping + beFee + packaging_cost) / be_divisor;
    }
  }

  // ═══════════════════════════════════════════
  // ANÁLISE DE COMPETITIVIDADE
  // ═══════════════════════════════════════════
  let status: 'excellent' | 'good' | 'warning' | 'danger' = 'good';
  let suggestion = '';
  const price_diff = competitor_price > 0 ? ((final_price - competitor_price) / competitor_price) * 100 : 0;

  if (competitor_price > 0) {
    if (final_price <= competitor_price * 0.95) {
      status = 'excellent';
      suggestion = 'Preço excelente! Você tem margem competitiva para dominar esse nicho.';
    } else if (final_price <= competitor_price * 1.05) {
      status = 'good';
      suggestion = 'Preço competitivo. Foque na qualidade do anúncio e velocidade de entrega.';
    } else if (final_price <= competitor_price * 1.15) {
      status = 'warning';
      suggestion = 'Preço um pouco acima. Considere negociar com fornecedor ou reduzir margem.';
    } else {
      status = 'danger';
      suggestion = 'Preço pouco competitivo. Revise custos ou considere outro fornecedor.';
    }
  }

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
    competitiveness: {
      is_competitive: final_price <= competitor_price * 1.05 || competitor_price === 0,
      price_diff,
      suggestion,
      status,
    },
  };
};

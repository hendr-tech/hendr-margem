/**
 * Mercado Livre - Tabelas Oficiais de Taxas e Frete
 * Fonte: Screenshots oficiais do ML (Abril 2025)
 * 
 * Comissões: Clássico 11% | Premium 16%
 * Taxa Fixa: R$ 6,00 para produtos abaixo de R$ 79
 * Frete: Varia por peso, faixa de preço e método de envio
 */

export const ML_CONFIG = {
  // Taxa fixa para produtos abaixo de R$ 79,00
  FIXED_FEE_THRESHOLD: 79.00,
  FIXED_FEE_AMOUNT: 6.00,

  // Comissões por Tipo de Anúncio (valores padrão por categoria)
  AD_TYPES: {
    CLASSIC: {
      label: 'Clássico',
      rate: 0.11,
      description: 'Comissão de 11%. Sem parcelamento sem juros para o comprador. Ideal para produtos de ticket médio/baixo.',
    },
    PREMIUM: {
      label: 'Premium',
      rate: 0.16,
      description: 'Comissão de 16%. Oferece parcelamento em até 18x sem juros ao comprador. Maior visibilidade e conversão.',
    },
  },

  // Faixas de preço que determinam o custo de frete para o vendedor
  PRICE_RANGES: {
    BELOW_79: { min: 0, max: 78.99, label: 'Abaixo de R$ 79' },
    RANGE_79_99: { min: 79, max: 98.99, label: 'R$ 79 - R$ 98,99' },
    RANGE_99_199: { min: 99, max: 198.99, label: 'R$ 99 - R$ 198,99' },
    RANGE_199_PLUS: { min: 199, max: Infinity, label: 'A partir de R$ 199' },
  },

  /**
   * Tabela de Frete - Coleta/Carrier (Padrão)
   * Para vendedores com reputação verde ou sem reputação (inclui Plano Decola)
   * Valores representam o custo que o VENDEDOR paga ao oferecer frete grátis
   * 
   * Para produtos < R$ 79: comprador paga o frete, vendedor paga R$ 0 de envio
   * Para produtos >= R$ 79: vendedor oferece frete grátis e paga conforme tabela
   */
  SHIPPING_COLETA: [
    // { maxWeight, range79, range99, range199 }
    { maxWeight: 0.3,  range79: 5.50,  range99: 7.00,  range199: 17.50 },
    { maxWeight: 0.5,  range79: 5.50,  range99: 7.00,  range199: 18.45 },
    { maxWeight: 1.0,  range79: 5.50,  range99: 7.00,  range199: 21.35 },
    { maxWeight: 2.0,  range79: 6.50,  range99: 8.00,  range199: 23.90 },
    { maxWeight: 3.0,  range79: 6.50,  range99: 8.50,  range199: 24.95 },
    { maxWeight: 4.0,  range79: 7.00,  range99: 9.00,  range199: 26.45 },
    { maxWeight: 5.0,  range79: 7.00,  range99: 9.00,  range199: 27.95 },
    { maxWeight: 9.0,  range79: 8.00,  range99: 10.00, range199: 36.80 },
    { maxWeight: 13.0, range79: 9.00,  range99: 11.00, range199: 45.55 },
    { maxWeight: 17.0, range79: 9.50,  range99: 12.00, range199: 55.45 },
    { maxWeight: 23.0, range79: 10.00, range99: 13.00, range199: 66.85 },
    { maxWeight: 30.0, range79: 11.00, range99: 14.00, range199: 77.50 },
  ],

  /**
   * Tabela de Frete - Full Super (Fulfillment ML)
   * Produto armazenado no centro de distribuição do Mercado Livre
   * Não depende de reputação do vendedor
   */
  SHIPPING_FULL: [
    { maxWeight: 0.3,  range79: 4.00,  range99: 6.00,  range199: 20.95 },
    { maxWeight: 0.5,  range79: 4.00,  range99: 6.00,  range199: 22.55 },
    { maxWeight: 1.0,  range79: 4.00,  range99: 6.00,  range199: 23.65 },
    { maxWeight: 2.0,  range79: 4.50,  range99: 6.50,  range199: 26.25 },
    { maxWeight: 3.0,  range79: 5.00,  range99: 7.00,  range199: 28.35 },
    { maxWeight: 5.0,  range79: 6.00,  range99: 7.00,  range199: 30.75 },
    { maxWeight: 9.0,  range79: 6.50,  range99: 7.50,  range199: 44.05 },
    { maxWeight: 13.0, range79: 7.00,  range99: 7.50,  range199: 60.65 },
    { maxWeight: 17.0, range79: 7.50,  range99: 8.00,  range199: 78.65 },
    { maxWeight: 23.0, range79: 7.50,  range99: 8.00,  range199: 105.95 },
    { maxWeight: 30.0, range79: 8.00,  range99: 8.00,  range199: 201.95 },
  ],

  // Regimes Tributários
  TAX_REGIMES: {
    CPF_MEI: {
      label: 'CPF / MEI',
      rate: 0,
      description: 'Sem imposto sobre venda. Para pessoa física ou MEI.',
      editable: false,
    },
    SIMPLES: {
      label: 'ME (Simples Nacional)',
      rate: 0.06,
      description: 'Alíquota variável. Digite sua faixa do Simples.',
      editable: true,
    },
  },

  // Valores padrão
  DEFAULTS: {
    TAX_RATE: 0.06,        // 6% Simples Nacional (padrão)
    PACKAGING_COST: 3.00,  // R$ 3,00
    MARGIN_TARGET: 0.20,   // 20%
    ADS_RATE: 0,           // 0% (sem Mercado Ads)
  }
};

export type AdTypeKey = keyof typeof ML_CONFIG.AD_TYPES;
export type ShippingMethod = 'COLETA' | 'FULL';
export type TaxRegime = 'CPF_MEI' | 'SIMPLES';

/**
 * Retorna o custo de frete que o VENDEDOR paga
 * Para produtos < R$ 79: retorna 0 (comprador paga)
 * Para produtos >= R$ 79: busca na tabela por peso e faixa de preço
 */
export const getShippingCost = (
  weight: number,
  salePrice: number,
  method: ShippingMethod = 'COLETA'
): number => {
  // Produtos abaixo de R$ 79: comprador paga frete, vendedor não paga
  if (salePrice < ML_CONFIG.FIXED_FEE_THRESHOLD) return 0;

  const table = method === 'FULL' ? ML_CONFIG.SHIPPING_FULL : ML_CONFIG.SHIPPING_COLETA;
  const tier = table.find(t => weight <= t.maxWeight) || table[table.length - 1];

  // Determinar faixa de preço
  if (salePrice < 99) return tier.range79;
  if (salePrice < 199) return tier.range99;
  return tier.range199;
};

/**
 * Mercado Livre - Tabelas Oficiais de Taxas e Frete
 * Fonte: Regras oficiais do ML (Abril 2026)
 * 
 * Comissões: Clássico 11% | Premium 16%
 * Taxa Fixa: R$ 6,25 para produtos abaixo de R$ 79
 * Frete: Varia por peso, faixa de preço e método de envio
 * 
 * ╔══════════════════════════════════════════════════════════╗
 * ║  COMO ATUALIZAR OS VALORES DE FRETE:                    ║
 * ║  1. Localize a tabela SHIPPING_COLETA ou SHIPPING_FULL  ║
 * ║  2. Cada objeto representa uma faixa de peso            ║
 * ║  3. Atualize os valores de range79, range120, range150  ║
 * ║     e range200 conforme a nova tabela do ML             ║
 * ║  4. Se o ML criar novas faixas de preço, adicione       ║
 * ║     novas propriedades e atualize getShippingCost()     ║
 * ╚══════════════════════════════════════════════════════════╝
 */

// ─── Faixas de peso oficiais do Mercado Livre ────────────
// Usado no dropdown de seleção de peso no formulário
export const WEIGHT_TIERS = [
  { value: 0.3,  label: 'Até 300g' },
  { value: 0.5,  label: 'De 300g a 500g' },
  { value: 1.0,  label: 'De 500g a 1kg' },
  { value: 2.0,  label: 'De 1kg a 2kg' },
  { value: 3.0,  label: 'De 2kg a 3kg' },
  { value: 4.0,  label: 'De 3kg a 4kg' },
  { value: 5.0,  label: 'De 4kg a 5kg' },
  { value: 9.0,  label: 'De 5kg a 9kg' },
  { value: 13.0, label: 'De 9kg a 13kg' },
  { value: 17.0, label: 'De 13kg a 17kg' },
  { value: 23.0, label: 'De 17kg a 23kg' },
  { value: 30.0, label: 'De 23kg a 30kg' },
] as const;

export const ML_CONFIG = {
  // ─── Tarifa fixa para produtos abaixo de R$ 79,00 ──────
  // ATUALIZADO: de R$ 6,00 para R$ 6,25 (Abril 2026)
  FIXED_FEE_THRESHOLD: 79.00,
  FIXED_FEE_AMOUNT: 6.25,

  // ─── Comissões por Tipo de Anúncio ─────────────────────
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

  // ─── Faixas de preço para cálculo de frete ─────────────
  // 4 faixas oficiais do ML para produtos >= R$ 79
  PRICE_RANGES: {
    BELOW_79:    { min: 0,      max: 78.99,   label: 'Abaixo de R$ 79' },
    RANGE_79:    { min: 79,     max: 119.99,  label: 'R$ 79 – R$ 119,99' },
    RANGE_120:   { min: 120,    max: 149.99,  label: 'R$ 120 – R$ 149,99' },
    RANGE_150:   { min: 150,    max: 199.99,  label: 'R$ 150 – R$ 199,99' },
    RANGE_200:   { min: 200,    max: Infinity, label: 'A partir de R$ 200' },
  },

  /**
   * ═══════════════════════════════════════════════════════
   * TABELA DE FRETE - COLETA / CARRIER (PADRÃO)
   * ═══════════════════════════════════════════════════════
   * 
   * Para vendedores com reputação verde ou sem reputação
   * (inclui Plano Decola).
   * 
   * Valores = custo que o VENDEDOR paga ao oferecer frete grátis.
   * 
   * Para produtos < R$ 79: comprador paga frete, vendedor paga R$ 0.
   * Para produtos >= R$ 79: vendedor paga conforme tabela abaixo.
   * 
   * Colunas:
   *   range79  = preço de venda entre R$ 79,00 e R$ 119,99
   *   range120 = preço de venda entre R$ 120,00 e R$ 149,99
   *   range150 = preço de venda entre R$ 150,00 e R$ 199,99
   *   range200 = preço de venda a partir de R$ 200,00
   * 
   * ─── INSTRUÇÕES PARA ATUALIZAÇÃO ──────────────────────
   * Se o Mercado Livre alterar os valores, basta editar os
   * números abaixo. A estrutura do código se adapta sozinha.
   */
  SHIPPING_COLETA: [
    // maxWeight | range79  | range120 | range150 | range200
    { maxWeight: 0.3,  range79: 18.99,  range120: 20.99, range150: 22.99,  range200: 24.99  },
    { maxWeight: 0.5,  range79: 18.99,  range120: 20.99, range150: 22.99,  range200: 25.99  },
    { maxWeight: 1.0,  range79: 18.99,  range120: 20.99, range150: 22.99,  range200: 27.99  },
    { maxWeight: 2.0,  range79: 19.99,  range120: 21.99, range150: 24.99,  range200: 30.99  },
    { maxWeight: 3.0,  range79: 20.99,  range120: 22.99, range150: 25.99,  range200: 32.99  },
    { maxWeight: 4.0,  range79: 21.99,  range120: 23.99, range150: 26.99,  range200: 34.99  },
    { maxWeight: 5.0,  range79: 22.99,  range120: 24.99, range150: 27.99,  range200: 36.99  },
    { maxWeight: 9.0,  range79: 25.99,  range120: 27.99, range150: 30.99,  range200: 42.99  },
    { maxWeight: 13.0, range79: 28.99,  range120: 30.99, range150: 34.99,  range200: 50.99  },
    { maxWeight: 17.0, range79: 32.99,  range120: 34.99, range150: 38.99,  range200: 58.99  },
    { maxWeight: 23.0, range79: 36.99,  range120: 38.99, range150: 42.99,  range200: 68.99  },
    { maxWeight: 30.0, range79: 42.99,  range120: 44.99, range150: 48.99,  range200: 78.99  },
  ],

  /**
   * ═══════════════════════════════════════════════════════
   * TABELA DE FRETE - FULL SUPER (FULFILLMENT ML)
   * ═══════════════════════════════════════════════════════
   * 
   * Produto armazenado no centro de distribuição do ML.
   * Não depende de reputação do vendedor.
   * 
   * Mesma estrutura de colunas da tabela Coleta.
   */
  SHIPPING_FULL: [
    // maxWeight | range79  | range120 | range150 | range200
    { maxWeight: 0.3,  range79: 17.99,  range120: 19.99, range150: 21.99,  range200: 23.99  },
    { maxWeight: 0.5,  range79: 17.99,  range120: 19.99, range150: 21.99,  range200: 24.99  },
    { maxWeight: 1.0,  range79: 17.99,  range120: 19.99, range150: 21.99,  range200: 26.99  },
    { maxWeight: 2.0,  range79: 18.99,  range120: 20.99, range150: 23.99,  range200: 29.99  },
    { maxWeight: 3.0,  range79: 19.99,  range120: 21.99, range150: 24.99,  range200: 31.99  },
    { maxWeight: 4.0,  range79: 20.99,  range120: 22.99, range150: 25.99,  range200: 33.99  },
    { maxWeight: 5.0,  range79: 21.99,  range120: 23.99, range150: 26.99,  range200: 35.99  },
    { maxWeight: 9.0,  range79: 24.99,  range120: 26.99, range150: 29.99,  range200: 41.99  },
    { maxWeight: 13.0, range79: 27.99,  range120: 29.99, range150: 33.99,  range200: 49.99  },
    { maxWeight: 17.0, range79: 31.99,  range120: 33.99, range150: 37.99,  range200: 57.99  },
    { maxWeight: 23.0, range79: 35.99,  range120: 37.99, range150: 41.99,  range200: 67.99  },
    { maxWeight: 30.0, range79: 41.99,  range120: 43.99, range150: 47.99,  range200: 77.99  },
  ],

  // ─── Regimes Tributários ───────────────────────────────
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

  // ─── Valores Padrão ────────────────────────────────────
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
 * Retorna o custo de frete que o VENDEDOR paga.
 * 
 * Para produtos < R$ 79: retorna 0 (comprador paga).
 * Para produtos >= R$ 79: busca na tabela por peso e faixa de preço.
 * 
 * Faixas de preço:
 *   R$ 79,00 – R$ 119,99  → range79
 *   R$ 120,00 – R$ 149,99 → range120
 *   R$ 150,00 – R$ 199,99 → range150
 *   R$ 200,00+             → range200
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

  // Determinar faixa de preço (4 faixas oficiais)
  if (salePrice < 120)  return tier.range79;
  if (salePrice < 150)  return tier.range120;
  if (salePrice < 200)  return tier.range150;
  return tier.range200;
};

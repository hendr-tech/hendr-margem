import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-2.0-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const data = req.body;

    const prompt = buildPrompt(data);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 700,
          topP: 0.9,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Gemini API error:', err);
      return res.status(502).json({ error: 'AI API error', detail: err?.error?.message });
    }

    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse the JSON response from Gemini
    try {
      const parsed = JSON.parse(text);
      return res.status(200).json(parsed);
    } catch {
      // If JSON parsing fails, wrap raw text in a fallback structure
      return res.status(200).json({
        verdict: 'ANÁLISE',
        summary: text.trim(),
        tips: [],
        action_plan: '',
      });
    }
  } catch (error: any) {
    console.error('AI verdict error:', error);
    return res.status(500).json({ error: 'Internal error', detail: error.message });
  }
}

function buildPrompt(data: any): string {
  const {
    name, cost, packaging_cost, final_price, liquido_ml, net_profit,
    margin_percentage, margin_target, roi, commission_rate, commission_amount,
    shipping_cost, fixed_fee, tax_amount, ads_amount, total_deductions,
    competitor_price, mode, tax_regime, weight, break_even_price, units_to_goal,
  } = data;

  const margin_target_pct = ((margin_target || 0.2) * 100).toFixed(0);
  const isSimulation = mode === 'simulation';
  const hasCompetitor = competitor_price && competitor_price > 0;

  let competitorContext = '';
  if (hasCompetitor) {
    if (competitor_price <= cost) {
      competitorContext = `⚠️ SITUAÇÃO CRÍTICA: O concorrente vende a R$ ${f(competitor_price)}, que é MENOR que o custo de R$ ${f(cost)}. Impossível competir igualando esse preço.`;
    } else {
      const diff = ((final_price - competitor_price) / competitor_price * 100).toFixed(1);
      competitorContext = `Concorrente vende a R$ ${f(competitor_price)}. Seu preço é ${Number(diff) > 0 ? diff + '% acima' : Math.abs(Number(diff)).toFixed(1) + '% abaixo'} do concorrente.`;
    }
  }

  return `Você é um consultor SÊNIOR de e-commerce especializado em Mercado Livre. Analise esta operação e dê um VEREDITO completo com dicas estratégicas para lucrar.

PRODUTO: ${name || 'Sem nome'}
MODO: ${isSimulation ? 'Simulação (preço definido pelo usuário)' : 'Sugestão (preço calculado pela ferramenta)'}
REGIME: ${tax_regime === 'CPF_MEI' ? 'CPF/MEI (sem imposto)' : 'Simples Nacional'}

CUSTOS DE ENTRADA:
- Custo do Produto: R$ ${f(cost)}
- Embalagem: R$ ${f(packaging_cost)}
- Peso: ${weight || '?'}kg

RESULTADO:
- Preço de Venda: R$ ${f(final_price)}
- Líquido ML (após taxas ML): R$ ${f(liquido_ml)}
- Lucro Real (no bolso): R$ ${f(net_profit)}
- Margem: ${(margin_percentage || 0).toFixed(1)}% (meta do usuário: ${margin_target_pct}%)
- ROI: ${(roi || 0).toFixed(1)}%
- Ponto de Equilíbrio: R$ ${f(break_even_price || 0)}
${units_to_goal ? `- Unidades p/ meta: ${units_to_goal}` : ''}

DETALHAMENTO:
- Comissão ML: R$ ${f(commission_amount)} (${((commission_rate || 0) * 100).toFixed(0)}%)
- Frete vendedor: R$ ${f(shipping_cost)}
- Taxa fixa: R$ ${f(fixed_fee)}
- Impostos: R$ ${f(tax_amount)}
- Ads: R$ ${f(ads_amount)}
- Total descontos: R$ ${f(total_deductions)}

${competitorContext ? 'CONCORRÊNCIA:\n' + competitorContext : ''}

INSTRUÇÕES (OBRIGATÓRIO):
Responda EXCLUSIVAMENTE com um JSON válido no formato abaixo, sem nada antes ou depois:

{
  "verdict": "VALE A PENA" ou "PODE MELHORAR" ou "NÃO VALE A PENA",
  "summary": "Análise em 2-3 frases diretas, citando valores reais em R$. Seja honesto e estratégico.",
  "tips": [
    "Dica prática e específica sobre o produto/precificação (cite valores)",
    "Dica sobre como melhorar a operação (frete, embalagem, fornecedor, etc)",
    "Dica sobre competitividade e posicionamento no Mercado Livre"
  ],
  "action_plan": "Plano de ação em 2-3 frases sobre O QUE FAZER AGORA para lucrar com este produto. Se não vale a pena, diga o que mudar. Se vale, diga como escalar. Seja específico com números."
}

REGRAS:
- Cite VALORES REAIS em R$ (nunca seja vago)
- Se houver concorrente, analise se é viável competir
- Se a margem está abaixo da meta, diga qual deveria ser o custo ideal
- Dê exatamente 3 dicas no array "tips"
- O "action_plan" deve ser ACIONÁVEL e específico
- Tudo em português brasileiro, linguagem direta
- O JSON deve ser válido e parseable`;
}

function f(v: any): string {
  return (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

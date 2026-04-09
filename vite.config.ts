import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      // Dev-only middleware: serve /api/ai-verdict locally by calling Gemini directly
      {
        name: 'ai-verdict-dev-proxy',
        configureServer(server) {
          server.middlewares.use('/api/ai-verdict', async (req, res) => {
            if (req.method === 'OPTIONS') {
              res.writeHead(200, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
              });
              res.end();
              return;
            }

            if (req.method !== 'POST') {
              res.writeHead(405, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }

            const GEMINI_API_KEY = env.GEMINI_API_KEY;
            if (!GEMINI_API_KEY) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'GEMINI_API_KEY not found in .env' }));
              return;
            }

            // Read request body
            let body = '';
            for await (const chunk of req) {
              body += chunk;
            }

            try {
              const data = JSON.parse(body);
              const prompt = buildDevPrompt(data);

              const MODEL = 'gemini-2.0-flash';
              const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

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
                console.error('[AI Dev] Gemini API error:', err);
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'AI API error', detail: err?.error?.message }));
                return;
              }

              const result = await response.json();
              const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';

              let parsed;
              try {
                parsed = JSON.parse(text);
              } catch {
                parsed = { verdict: 'ANÁLISE', summary: text.trim(), tips: [], action_plan: '' };
              }

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(parsed));
            } catch (error: any) {
              console.error('[AI Dev] Error:', error.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Internal error', detail: error.message }));
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});

// Simplified prompt builder for dev (mirrors api/ai-verdict.ts)
function buildDevPrompt(data: any): string {
  const f = (v: any) => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
      competitorContext = `⚠️ SITUAÇÃO CRÍTICA: O concorrente vende a R$ ${f(competitor_price)}, que é MENOR que o custo de R$ ${f(cost)}.`;
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

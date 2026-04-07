import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calculator,
  Save,
  Trash2,
  TrendingUp,
  TrendingDown,
  Package,
  Percent,
  Plus,
  ArrowRight,
  Share,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Search,
  Weight,
  DollarSign,
  Info,
  Truck,
  Tag,
  BarChart3,
  Target,
  ShieldCheck,
  Zap,
  X,
  LogOut,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ML_CONFIG, AdTypeKey, ShippingMethod } from './config/mlConfig';
import { calculatePricing, PricingInput, PricingResult } from './lib/pricingLogic';
import {
  supabase,
  signOut,
  onAuthStateChange,
  fetchProducts,
  insertProduct,
  deleteProduct,
  type Session,
  type ProductRow,
} from './lib/supabase';
import AuthScreen from './components/AuthScreen';

// ─── Types ───────────────────────────────────────────────

// Re-export ProductRow as SavedProduct for backward compatibility
type SavedProduct = ProductRow;

// ─── Utility ─────────────────────────────────────────────

const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Components ──────────────────────────────────────────

const Tooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-block ml-1">
    <Info className="w-3.5 h-3.5 text-on-surface-variant/40 cursor-help hover:text-secondary transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-52 p-3 bg-on-surface text-white text-[10px] rounded-2xl shadow-2xl z-50 leading-relaxed">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-6 border-transparent border-t-on-surface" />
    </div>
  </div>
);

const InputField = ({
  label, value, onChange, type = "number", prefix, suffix, tooltip, placeholder, icon: Icon,
}: {
  label: string; value: any; onChange: (val: any) => void; type?: string;
  prefix?: string; suffix?: string; tooltip?: string; placeholder?: string;
  icon?: any;
}) => (
  <div className="space-y-1.5">
    <label className="flex items-center text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60 px-1">
      {Icon && <Icon className="w-3 h-3 mr-1.5 text-secondary-dark" />}
      {label}
      {tooltip && <Tooltip text={tooltip} />}
    </label>
    <div className="relative flex items-center">
      {prefix && <span className="absolute left-4 font-bold text-on-surface-variant/50 text-sm">{prefix}</span>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-surface-container-high/60 border border-transparent rounded-2xl py-3.5 ${prefix ? 'pl-11' : 'px-4'} ${suffix ? 'pr-11' : 'px-4'} text-base font-bold text-on-surface focus:ring-2 focus:ring-secondary focus:border-secondary focus:bg-white transition-all outline-none placeholder:text-on-surface-variant/25`}
      />
      {suffix && <span className="absolute right-4 font-bold text-on-surface-variant/50 text-sm">{suffix}</span>}
    </div>
  </div>
);

// ─── Result Card ─────────────────────────────────────────

const ResultCard = ({ result, onSave, saving }: { result: PricingResult; onSave: () => void; saving: boolean }) => {
  const isProfit = result.net_profit > 0;
  const worthIt = isProfit && result.roi > 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="space-y-5"
    >
      {/* Main Verdict */}
      <div className={`rounded-3xl p-6 border-2 ${worthIt
          ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
          : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200'
        }`}
      >
        <div className="flex items-center gap-3 mb-4">
          {worthIt ? (
            <div className="w-10 h-10 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
          ) : (
            <div className="w-10 h-10 bg-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <p className={`text-lg font-black ${worthIt ? 'text-green-700' : 'text-red-700'}`}>
              {worthIt ? 'Vale a Pena! ✅' : 'Não Compensa ❌'}
            </p>
            <p className="text-xs text-on-surface-variant">
              {result.mode === 'simulation' ? 'Simulação de preço' : 'Preço sugerido pela calculadora'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/70 p-3.5 rounded-2xl">
            <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60">Preço de Venda</p>
            <p className="text-xl font-black text-on-surface mt-0.5">R$ {fmt(result.final_price)}</p>
          </div>
          <div className="bg-white/70 p-3.5 rounded-2xl">
            <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60">Você Recebe (Líquido)</p>
            <p className="text-xl font-black text-secondary-dark mt-0.5">R$ {fmt(result.liquido_ml)}</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-surface-container-lowest p-3.5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60">Lucro Real</p>
          <p className={`text-lg font-black mt-0.5 ${isProfit ? 'text-green-600' : 'text-red-500'}`}>
            R$ {fmt(result.net_profit)}
          </p>
        </div>
        <div className="bg-surface-container-lowest p-3.5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60">Margem</p>
          <p className={`text-lg font-black mt-0.5 ${isProfit ? 'text-green-600' : 'text-red-500'}`}>
            {result.margin_percentage.toFixed(1)}%
          </p>
        </div>
        <div className="bg-surface-container-lowest p-3.5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60">ROI</p>
          <p className={`text-lg font-black mt-0.5 ${isProfit ? 'text-green-600' : 'text-red-500'}`}>
            {result.roi.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-sm border border-slate-100 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">Detalhamento dos Custos</p>
        <div className="space-y-2.5">
          <CostRow label="Comissão ML" value={result.commission_amount} pct={`${(result.commission_rate * 100).toFixed(0)}%`} />
          <CostRow label="Frete (vendedor paga)" value={result.shipping_cost} />
          {result.fixed_fee > 0 && <CostRow label="Taxa Fixa (produto < R$ 79)" value={result.fixed_fee} />}
          <CostRow label="Custo do Produto" value={result.cost} />
          <CostRow label="Embalagem" value={result.packaging_cost} />
          <CostRow label="Impostos" value={result.tax_amount} pct={`${(result.tax_amount / result.final_price * 100).toFixed(1)}%`} />
          {result.ads_amount > 0 && <CostRow label="Mercado Ads" value={result.ads_amount} />}
          <div className="border-t border-slate-200 pt-2 flex justify-between">
            <span className="text-xs font-black text-on-surface">Total de Custos</span>
            <span className="text-xs font-black text-on-surface">R$ {fmt(result.total_deductions)}</span>
          </div>
        </div>
      </div>

      {/* Break-even & Goal */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60">Ponto de Equilíbrio</p>
          <p className="text-base font-black text-on-surface mt-0.5">R$ {fmt(result.break_even_price)}</p>
          <p className="text-[9px] text-on-surface-variant mt-1">Preço mín. p/ lucro zero</p>
        </div>
        {result.units_to_goal > 0 && (
          <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60">Meta Mensal</p>
            <p className="text-base font-black text-on-surface mt-0.5">{result.units_to_goal} un.</p>
            <p className="text-[9px] text-on-surface-variant mt-1">p/ atingir a meta</p>
          </div>
        )}
      </div>

      {/* Competitiveness */}
      {result.competitiveness.suggestion && (
        <div className={`p-4 rounded-2xl border ${
          result.competitiveness.status === 'excellent' ? 'bg-green-50 border-green-200' :
          result.competitiveness.status === 'good' ? 'bg-blue-50 border-blue-200' :
          result.competitiveness.status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-on-surface-variant" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Competitividade</p>
          </div>
          <p className="text-xs font-medium text-on-surface leading-relaxed">{result.competitiveness.suggestion}</p>
          {result.competitiveness.price_diff !== 0 && (
            <p className={`text-[10px] font-bold mt-1.5 ${result.competitiveness.price_diff <= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {result.competitiveness.price_diff <= 0 ? '↓ Abaixo' : '↑ Acima'} do concorrente em {Math.abs(result.competitiveness.price_diff).toFixed(1)}%
            </p>
          )}
        </div>
      )}

      {/* Visual Bar */}
      <div className="space-y-2">
        <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/50 px-1">Distribuição do Preço</p>
        <div className="h-3 w-full flex rounded-full overflow-hidden bg-slate-100">
          <div style={{ width: `${Math.max(0, (result.cost / result.final_price) * 100)}%` }} className="bg-slate-400 h-full" title="Custo" />
          <div style={{ width: `${Math.max(0, (result.commission_amount / result.final_price) * 100)}%` }} className="bg-blue-400 h-full" title="Comissão" />
          <div style={{ width: `${Math.max(0, (result.shipping_cost / result.final_price) * 100)}%` }} className="bg-orange-400 h-full" title="Frete" />
          <div style={{ width: `${Math.max(0, (result.tax_amount / result.final_price) * 100)}%` }} className="bg-purple-300 h-full" title="Imposto" />
          <div style={{ width: `${Math.max(0, (result.net_profit / result.final_price) * 100)}%` }} className="bg-green-400 h-full" title="Lucro" />
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[8px] font-bold uppercase text-on-surface-variant/50">
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-slate-400 rounded-full" /> Custo</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-400 rounded-full" /> Comissão</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-orange-400 rounded-full" /> Frete</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-purple-300 rounded-full" /> Imposto</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-400 rounded-full" /> Lucro</span>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 py-3.5 bg-secondary text-on-surface rounded-2xl font-bold text-sm shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar na Lista'}
        </button>
        <button
          onClick={() => {
            const text = `*Análise HendrMargem*\nProduto: –\nPreço: R$ ${fmt(result.final_price)}\nVocê Recebe: R$ ${fmt(result.liquido_ml)}\nLucro Real: R$ ${fmt(result.net_profit)}\nROI: ${result.roi.toFixed(1)}%\nMargem: ${result.margin_percentage.toFixed(1)}%`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
          }}
          className="flex items-center justify-center gap-2 py-3.5 bg-green-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Share className="w-4 h-4" />
          WhatsApp
        </button>
      </div>
    </motion.div>
  );
};

const CostRow = ({ label, value, pct }: { label: string; value: number; pct?: string }) => (
  <div className="flex justify-between items-center">
    <span className="text-xs text-on-surface-variant">{label} {pct && <span className="text-[10px] text-on-surface-variant/50">({pct})</span>}</span>
    <span className="text-xs font-bold text-on-surface">R$ {fmt(value)}</span>
  </div>
);

// ─── Product List Item ───────────────────────────────────

const ProductItem = ({ product, onDelete }: { product: SavedProduct; onDelete: (id: string) => void }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: -100 }}
    className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all"
  >
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <h4 className="font-bold text-on-surface text-sm truncate">{product.name}</h4>
        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
          product.ad_type === 'PREMIUM' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
        }`}>
          {product.ad_type === 'PREMIUM' ? 'Premium' : 'Clássico'}
        </span>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-on-surface-variant font-medium">
        <span>Venda: R$ {fmt(product.final_price)}</span>
        <span className={product.net_profit > 0 ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>
          Lucro: R$ {fmt(product.net_profit)}
        </span>
        <span className="text-on-surface-variant/40">ROI: {Number(product.roi).toFixed(0)}%</span>
      </div>
    </div>
    <button
      onClick={() => onDelete(product.id)}
      className="p-2 rounded-xl text-on-surface-variant/30 hover:bg-red-50 hover:text-red-500 transition-all ml-2 opacity-0 group-hover:opacity-100"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  </motion.div>
);

// ─── Como Usar (Guide) Tab ──────────────────────────────

const GuideTab = () => (
  <motion.div
    key="guide"
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="space-y-6"
  >
    <div>
      <h2 className="text-2xl font-black tracking-tight text-on-surface">Como Usar</h2>
      <p className="text-on-surface-variant text-sm">Entenda as taxas e use a calculadora com confiança.</p>
    </div>

    {/* Quick Start */}
    <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-secondary-dark" />
        <h3 className="text-base font-black text-on-surface">Passo a Passo</h3>
      </div>
      <div className="space-y-3">
        <Step n={1} title="Nome do Produto" desc="Digite o nome para identificação (ex: Teclado Gamer)." />
        <Step n={2} title="Custo do Produto" desc="Quanto você paga ao fornecedor pelo produto." />
        <Step n={3} title="Peso com Embalagem" desc="Peso total em kg (produto + caixa + proteção). Determina o custo de frete." />
        <Step n={4} title="Tipo de Anúncio" desc="Escolha entre Clássico (11%) ou Premium (16%). Veja diferenças abaixo." />
        <Step n={5} title="Escolha o Modo" desc='Use "Sugerir Preço" para encontrar o preço ideal, ou "Simular" para testar um preço específico.' />
        <Step n={6} title="Calcular!" desc="Toque em Calcular e veja se vale a pena. Salve na lista para comparar depois." />
      </div>
    </div>

    {/* Ad Type Comparison */}
    <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
      <div className="flex items-center gap-2">
        <Tag className="w-5 h-5 text-secondary-dark" />
        <h3 className="text-base font-black text-on-surface">Clássico vs Premium</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
          <p className="text-sm font-black text-on-surface">Clássico</p>
          <p className="text-2xl font-black text-on-surface">11%</p>
          <ul className="text-[11px] text-on-surface-variant space-y-1 leading-relaxed">
            <li>• Comissão menor</li>
            <li>• Sem parcelamento s/ juros</li>
            <li>• Menor visibilidade</li>
            <li>• Bom para produtos baratos</li>
          </ul>
        </div>
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 space-y-2">
          <p className="text-sm font-black text-blue-800">Premium ⭐</p>
          <p className="text-2xl font-black text-blue-700">16%</p>
          <ul className="text-[11px] text-blue-900/70 space-y-1 leading-relaxed">
            <li>• Comissão maior</li>
            <li>• Parcelamento até 18x s/ juros</li>
            <li>• Maior visibilidade</li>
            <li>• Mais vendas (maior conversão)</li>
          </ul>
        </div>
      </div>
      <p className="text-[10px] text-on-surface-variant/60 leading-relaxed">
        * As comissões podem variar de 11-14% (Clássico) e 16-19% (Premium) dependendo da categoria. Os valores acima são os padrões mais comuns.
      </p>
    </div>

    {/* Fee Explanation */}
    <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
      <div className="flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-secondary-dark" />
        <h3 className="text-base font-black text-on-surface">Taxas do Mercado Livre</h3>
      </div>
      <div className="space-y-3 text-xs text-on-surface-variant leading-relaxed">
        <InfoBlock title="Taxa Fixa (R$ 6,00)" desc="Cobrada em TODOS os produtos com preço abaixo de R$ 79,00. Acima de R$ 79, não há taxa fixa." />
        <InfoBlock title="Frete (Mercado Envios)" desc="Para produtos ≥ R$ 79, é obrigatório oferecer frete grátis. O vendedor paga o custo de envio ao ML. O custo varia por peso e faixa de preço do produto." />
        <InfoBlock title="Comissão" desc="Percentual cobrado sobre o preço de venda. Clássico: 11%. Premium: 16%." />
        <InfoBlock title='O que é "Líquido ML"?' desc="É o valor que cai na sua conta do Mercado Pago após todas as deduções do ML (comissão + frete + taxa fixa). Ainda não é seu lucro — falta descontar o custo do produto, impostos e embalagem." />
        <InfoBlock title="Lucro Real" desc="É o que sobra no seu bolso: Líquido ML − Custo do Produto − Impostos − Embalagem." />
      </div>
    </div>

    {/* Shipping Table */}
    <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
      <div className="flex items-center gap-2">
        <Truck className="w-5 h-5 text-secondary-dark" />
        <h3 className="text-base font-black text-on-surface">Tabela de Frete (Coleta)</h3>
      </div>
      <p className="text-[10px] text-on-surface-variant/60">Custo que o vendedor paga para oferecer frete grátis (reputação verde / Plano Decola)</p>
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-on-surface-variant/60 font-bold uppercase">
              <th className="text-left py-2 px-2">Peso</th>
              <th className="text-right py-2 px-2">R$79-99</th>
              <th className="text-right py-2 px-2">R$99-199</th>
              <th className="text-right py-2 px-2">R$199+</th>
            </tr>
          </thead>
          <tbody className="text-on-surface font-medium">
            {ML_CONFIG.SHIPPING_COLETA.map((tier, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-slate-50' : ''}>
                <td className="py-1.5 px-2">{tier.maxWeight}kg</td>
                <td className="text-right py-1.5 px-2">R$ {fmt(tier.range79)}</td>
                <td className="text-right py-1.5 px-2">R$ {fmt(tier.range99)}</td>
                <td className="text-right py-1.5 px-2">R$ {fmt(tier.range199)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[9px] text-on-surface-variant/40">Para produtos abaixo de R$ 79: comprador paga o frete, vendedor paga R$ 0 de envio + R$ 6 de taxa fixa.</p>
    </div>

    {/* Tips */}
    <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-3xl p-6 border border-secondary/20 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-secondary-dark" />
        <h3 className="text-base font-black text-on-surface">Dicas de Ouro</h3>
      </div>
      <ul className="text-xs text-on-surface-variant space-y-2 leading-relaxed">
        <li className="flex gap-2"><span className="text-secondary-dark font-bold">💡</span> ROI acima de 30% é excelente. Acima de 15% é bom. Abaixo de 10% é arriscado.</li>
        <li className="flex gap-2"><span className="text-secondary-dark font-bold">💡</span> Use o modo "Simular" para testar o preço do concorrente e ver se você consegue lucrar.</li>
        <li className="flex gap-2"><span className="text-secondary-dark font-bold">💡</span> Produtos leves ({'<'} 1kg) e com preço entre R$ 79-99 têm o frete mais barato.</li>
        <li className="flex gap-2"><span className="text-secondary-dark font-bold">💡</span> O Premium vende mais, mas a comissão é 5% maior. Faça as contas!</li>
        <li className="flex gap-2"><span className="text-secondary-dark font-bold">💡</span> Sempre inclua custo de embalagem e impostos para ter o lucro REAL.</li>
      </ul>
    </div>
  </motion.div>
);

const Step = ({ n, title, desc }: { n: number; title: string; desc: string }) => (
  <div className="flex gap-3">
    <div className="w-7 h-7 bg-secondary rounded-xl flex items-center justify-center shrink-0">
      <span className="text-xs font-black text-on-surface">{n}</span>
    </div>
    <div>
      <p className="text-sm font-bold text-on-surface">{title}</p>
      <p className="text-xs text-on-surface-variant leading-relaxed">{desc}</p>
    </div>
  </div>
);

const InfoBlock = ({ title, desc }: { title: string; desc: string }) => (
  <div>
    <p className="text-xs font-bold text-on-surface mb-0.5">{title}</p>
    <p className="text-[11px] text-on-surface-variant leading-relaxed">{desc}</p>
  </div>
);

// ─── Main App ────────────────────────────────────────────

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'calc' | 'list' | 'guide'>('calc');
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<SavedProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [calcMode, setCalcMode] = useState<'suggestion' | 'simulation'>('suggestion');

  // Form State — minimal required fields
  const [formData, setFormData] = useState<PricingInput>({
    name: '',
    cost: 0,
    weight: 0.5,
    packaging_cost: ML_CONFIG.DEFAULTS.PACKAGING_COST,
    tax_rate: ML_CONFIG.DEFAULTS.TAX_RATE,
    ads_rate: ML_CONFIG.DEFAULTS.ADS_RATE,
    margin_target: ML_CONFIG.DEFAULTS.MARGIN_TARGET,
    ad_type: 'CLASSIC',
    shipping_method: 'COLETA',
    competitor_price: 0,
    manual_price: 0,
    monthly_goal: 5000,
  });

  const updateForm = useCallback((patch: Partial<PricingInput>) => {
    setFormData(prev => ({ ...prev, ...patch }));
  }, []);

  // ─── Auth listener ────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange((sess) => {
      setSession(sess);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ─── Load products from Supabase ──────────────────────
  useEffect(() => {
    if (!session) {
      setProducts([]);
      setProductsLoading(false);
      return;
    }
    setProductsLoading(true);
    fetchProducts()
      .then(setProducts)
      .catch((err) => console.error('Erro ao carregar produtos:', err))
      .finally(() => setProductsLoading(false));
  }, [session]);

  // Live calculation
  const result = useMemo(() => calculatePricing(formData), [formData]);

  // Comparison: Classic vs Premium
  const comparison = useMemo(() => ({
    classic: calculatePricing({ ...formData, ad_type: 'CLASSIC' }),
    premium: calculatePricing({ ...formData, ad_type: 'PREMIUM' }),
  }), [formData]);

  // Save product to Supabase
  const handleSave = useCallback(async () => {
    if (!formData.name.trim()) {
      alert('Digite o nome do produto.');
      return;
    }
    setSaving(true);
    try {
      const newProduct = await insertProduct({
        name: formData.name,
        cost: formData.cost,
        weight: formData.weight,
        ad_type: formData.ad_type,
        shipping_method: formData.shipping_method,
        packaging_cost: formData.packaging_cost,
        tax_rate: formData.tax_rate,
        ads_rate: formData.ads_rate,
        margin_target: formData.margin_target,
        competitor_price: formData.competitor_price,
        manual_price: formData.manual_price || 0,
        monthly_goal: formData.monthly_goal || 0,
        final_price: result.final_price,
        net_profit: result.net_profit,
        roi: result.roi,
        liquido_ml: result.liquido_ml,
        is_worth_it: result.net_profit > 0 && result.roi > 10,
      });
      setProducts(prev => [newProduct, ...prev]);
      setShowResult(false);
      updateForm({ name: '', cost: 0, manual_price: 0, competitor_price: 0 });
      setActiveTab('list');
    } catch (err) {
      console.error('Erro ao salvar:', err);
      alert('Erro ao salvar produto. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }, [formData, result, updateForm]);

  // Delete product from Supabase
  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Erro ao deletar:', err);
      alert('Erro ao deletar produto.');
    }
  }, []);

  // Filtered & grouped products
  const { worthIt, notWorth } = useMemo(() => {
    const filtered = products.filter(p =>
      searchQuery ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
    );
    return {
      worthIt: filtered.filter(p => p.is_worth_it),
      notWorth: filtered.filter(p => !p.is_worth_it),
    };
  }, [products, searchQuery]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    await signOut();
  }, []);

  // ─── Auth gate ────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-secondary animate-spin mx-auto mb-3" />
          <p className="text-on-surface-variant text-sm font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl shadow-sm border-b border-slate-200/50">
        <div className="flex justify-between items-center px-5 py-3 w-full max-w-2xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-secondary rounded-xl flex items-center justify-center shadow-md shadow-secondary/25">
              <TrendingUp className="text-on-surface w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-on-surface tracking-tight leading-none">HendrMargem</h1>
              <p className="text-[9px] text-on-surface-variant/50 font-medium tracking-wider uppercase">Calculadora ML</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl text-on-surface-variant/40 hover:bg-red-50 hover:text-red-500 transition-all"
            title="Sair"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      <main className="pt-20 px-4 max-w-2xl mx-auto space-y-6">
        <AnimatePresence mode="wait">
          {/* ═══ CALCULATOR TAB ═══ */}
          {activeTab === 'calc' && (
            <motion.div
              key="calc"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-5"
            >
              {/* Title + Mode Toggle */}
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-on-surface">Calculadora</h2>
                  <p className="text-on-surface-variant text-xs">Descubra se vale a pena vender.</p>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex bg-surface-container-low p-1 rounded-2xl">
                <button
                  onClick={() => { setCalcMode('suggestion'); updateForm({ manual_price: 0 }); setShowResult(false); }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    calcMode === 'suggestion' ? 'bg-secondary text-on-surface shadow-sm' : 'text-on-surface-variant'
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  Sugerir Preço
                </button>
                <button
                  onClick={() => { setCalcMode('simulation'); setShowResult(false); }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    calcMode === 'simulation' ? 'bg-secondary text-on-surface shadow-sm' : 'text-on-surface-variant'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Simular Lucro
                </button>
              </div>

              {/* ── Form ── */}
              <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
                <InputField
                  label="Nome do Produto"
                  type="text"
                  icon={Package}
                  value={formData.name}
                  onChange={(val) => updateForm({ name: val })}
                  placeholder="Ex: Fone Bluetooth TWS"
                />
                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    label="Custo (fornecedor)"
                    prefix="R$"
                    icon={DollarSign}
                    value={formData.cost || ''}
                    onChange={(val) => updateForm({ cost: val })}
                    tooltip="Quanto você paga pelo produto."
                    placeholder="0,00"
                  />
                  <InputField
                    label="Peso c/ embalagem"
                    suffix="kg"
                    icon={Weight}
                    value={formData.weight || ''}
                    onChange={(val) => updateForm({ weight: val })}
                    tooltip="Peso total: produto + caixa + proteção."
                    placeholder="0.5"
                  />
                </div>

                {/* Quick weight buttons */}
                <div className="flex gap-1.5 flex-wrap">
                  {[0.3, 0.5, 1, 2, 3, 5].map(w => (
                    <button
                      key={w}
                      onClick={() => updateForm({ weight: w })}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                        formData.weight === w
                          ? 'bg-secondary text-on-surface'
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {w}kg
                    </button>
                  ))}
                </div>
              </div>

              {/* Ad Type */}
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(ML_CONFIG.AD_TYPES) as AdTypeKey[]).map((type) => {
                  const config = ML_CONFIG.AD_TYPES[type];
                  const isSelected = formData.ad_type === type;
                  return (
                    <button
                      key={type}
                      onClick={() => updateForm({ ad_type: type })}
                      className={`p-4 rounded-2xl text-left transition-all border-2 ${
                        isSelected
                          ? type === 'PREMIUM' ? 'bg-blue-50 border-blue-300 shadow-md' : 'bg-secondary/20 border-secondary shadow-md'
                          : 'bg-surface-container-lowest border-transparent hover:bg-surface-container-low'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${isSelected ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                          {config.label}
                        </span>
                        {type === 'PREMIUM' && <span className="text-[9px]">⭐</span>}
                      </div>
                      <p className={`text-2xl font-black ${isSelected ? 'text-on-surface' : 'text-on-surface-variant/60'}`}>
                        {(config.rate * 100).toFixed(0)}%
                      </p>
                      <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-on-surface/60' : 'text-on-surface-variant/40'}`}>
                        Comissão
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Mode-specific input */}
              <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
                {calcMode === 'simulation' ? (
                  <InputField
                    label="Preço de Venda (teste)"
                    prefix="R$"
                    icon={Tag}
                    value={formData.manual_price || ''}
                    onChange={(val) => updateForm({ manual_price: val })}
                    tooltip="Coloque o preço que quer testar (ex: preço do concorrente)."
                    placeholder="Ex: 149,90"
                  />
                ) : (
                  <InputField
                    label="Margem de Lucro Desejada"
                    suffix="%"
                    icon={Percent}
                    value={formData.margin_target * 100 || ''}
                    onChange={(val) => updateForm({ margin_target: val / 100 })}
                    tooltip="Quanto % você quer de lucro sobre o preço de venda."
                    placeholder="20"
                  />
                )}
                <InputField
                  label="Preço do Concorrente (opcional)"
                  prefix="R$"
                  icon={Search}
                  value={formData.competitor_price || ''}
                  onChange={(val) => updateForm({ competitor_price: val })}
                  tooltip="Para comparar se seu preço é competitivo."
                  placeholder="0,00"
                />
              </div>

              {/* Shipping Method */}
              <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-sm border border-slate-100 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60 flex items-center gap-1.5">
                  <Truck className="w-3 h-3 text-secondary-dark" /> Método de Envio
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateForm({ shipping_method: 'COLETA' })}
                    className={`p-3 rounded-xl text-left transition-all border ${
                      formData.shipping_method === 'COLETA' ? 'bg-secondary/15 border-secondary' : 'bg-surface-container-low border-transparent'
                    }`}
                  >
                    <p className={`text-xs font-bold ${formData.shipping_method === 'COLETA' ? 'text-on-surface' : 'text-on-surface-variant'}`}>Coleta/Carrier</p>
                    <p className="text-[9px] text-on-surface-variant/50 mt-0.5">Envio padrão ML</p>
                  </button>
                  <button
                    onClick={() => updateForm({ shipping_method: 'FULL' })}
                    className={`p-3 rounded-xl text-left transition-all border ${
                      formData.shipping_method === 'FULL' ? 'bg-secondary/15 border-secondary' : 'bg-surface-container-low border-transparent'
                    }`}
                  >
                    <p className={`text-xs font-bold ${formData.shipping_method === 'FULL' ? 'text-on-surface' : 'text-on-surface-variant'}`}>Full / Super</p>
                    <p className="text-[9px] text-on-surface-variant/50 mt-0.5">Estoque no ML</p>
                  </button>
                </div>
              </div>

              {/* Advanced Settings (Collapsible) */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-xs font-bold text-on-surface-variant/50 hover:text-secondary-dark transition-colors w-full justify-center py-2"
              >
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Configurações Avançadas
              </button>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <InputField
                          label="Imposto"
                          suffix="%"
                          value={formData.tax_rate * 100}
                          onChange={(val) => updateForm({ tax_rate: val / 100 })}
                          tooltip="Sua alíquota (Simples Nacional padrão: 6,5%)."
                        />
                        <InputField
                          label="Embalagem"
                          prefix="R$"
                          value={formData.packaging_cost}
                          onChange={(val) => updateForm({ packaging_cost: val })}
                          tooltip="Caixa, fita, plástico bolha."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <InputField
                          label="Mercado Ads"
                          suffix="%"
                          value={formData.ads_rate * 100}
                          onChange={(val) => updateForm({ ads_rate: val / 100 })}
                          tooltip="Investimento em publicidade no ML."
                        />
                        <InputField
                          label="Meta Mensal"
                          prefix="R$"
                          value={formData.monthly_goal}
                          onChange={(val) => updateForm({ monthly_goal: val })}
                          tooltip="Quanto quer lucrar por mês com este produto."
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Classic vs Premium Comparison */}
              {(formData.cost > 0) && (
                <div className="bg-surface-container-lowest rounded-3xl p-4 shadow-sm border border-slate-100">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-2 px-1">Comparativo Rápido</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`p-3 rounded-xl border transition-all ${formData.ad_type === 'CLASSIC' ? 'border-secondary bg-secondary/5' : 'border-transparent bg-surface-container-low'}`}>
                      <p className="text-[10px] font-bold text-on-surface-variant">Clássico 11%</p>
                      <p className="text-base font-black text-on-surface">R$ {fmt(comparison.classic.final_price)}</p>
                      <p className={`text-[10px] font-bold ${comparison.classic.net_profit > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        Lucro: R$ {fmt(comparison.classic.net_profit)}
                      </p>
                    </div>
                    <div className={`p-3 rounded-xl border transition-all ${formData.ad_type === 'PREMIUM' ? 'border-blue-300 bg-blue-50' : 'border-transparent bg-surface-container-low'}`}>
                      <p className="text-[10px] font-bold text-on-surface-variant">Premium 16%</p>
                      <p className="text-base font-black text-on-surface">R$ {fmt(comparison.premium.final_price)}</p>
                      <p className={`text-[10px] font-bold ${comparison.premium.net_profit > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        Lucro: R$ {fmt(comparison.premium.net_profit)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Calculate Button */}
              <button
                onClick={() => setShowResult(true)}
                disabled={formData.cost <= 0}
                className="w-full bg-secondary text-on-surface py-4 rounded-2xl font-black text-lg shadow-xl shadow-secondary/25 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Calculator className="w-6 h-6" />
                Calcular
              </button>

              {/* Result */}
              <AnimatePresence>
                {showResult && formData.cost > 0 && (
                  <ResultCard result={result} onSave={handleSave} saving={saving} />
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ═══ PRODUCT LIST TAB ═══ */}
          {activeTab === 'list' && (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-2xl font-black tracking-tight text-on-surface">Meus Produtos</h2>
                <p className="text-on-surface-variant text-xs">
                  {products.length} produto{products.length !== 1 ? 's' : ''} salvo{products.length !== 1 ? 's' : ''}
                </p>
              </div>

              {products.length > 3 && (
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/30" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar produto..."
                    className="w-full bg-surface-container-high/60 border border-transparent rounded-2xl py-3 pl-10 pr-4 text-sm font-medium text-on-surface focus:ring-2 focus:ring-secondary focus:bg-white transition-all outline-none placeholder:text-on-surface-variant/25"
                  />
                </div>
              )}

              {products.length === 0 ? (
                <div className="text-center py-16 bg-surface-container-low rounded-3xl border-2 border-dashed border-on-surface-variant/10">
                  <Package className="w-10 h-10 text-on-surface-variant/15 mx-auto mb-3" />
                  <p className="text-on-surface-variant font-medium text-sm">Nenhum produto salvo.</p>
                  <p className="text-on-surface-variant/50 text-xs mt-1">Use a calculadora e salve seus estudos aqui.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Worth It */}
                  {worthIt.length > 0 && (
                    <section className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
                          <TrendingUp className="text-green-600 w-3.5 h-3.5" />
                        </div>
                        <h3 className="text-sm font-black text-on-surface">Vale a Pena ({worthIt.length})</h3>
                      </div>
                      <div className="space-y-2">
                        <AnimatePresence>
                          {worthIt.map(p => (
                            <ProductItem key={p.id} product={p} onDelete={handleDelete} />
                          ))}
                        </AnimatePresence>
                      </div>
                    </section>
                  )}

                  {/* Not Worth It */}
                  {notWorth.length > 0 && (
                    <section className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <div className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center">
                          <TrendingDown className="text-red-500 w-3.5 h-3.5" />
                        </div>
                        <h3 className="text-sm font-black text-on-surface">Não Compensa ({notWorth.length})</h3>
                      </div>
                      <div className="space-y-2">
                        <AnimatePresence>
                          {notWorth.map(p => (
                            <ProductItem key={p.id} product={p} onDelete={handleDelete} />
                          ))}
                        </AnimatePresence>
                      </div>
                    </section>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ GUIDE TAB ═══ */}
          {activeTab === 'guide' && <GuideTab />}
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 bg-white/90 backdrop-blur-2xl z-50 rounded-t-3xl shadow-[0_-8px_30px_-10px_rgba(0,0,0,0.08)] border-t border-slate-200/50">
        {[
          { id: 'calc' as const, icon: Calculator, label: 'Calculadora' },
          { id: 'list' as const, icon: Package, label: 'Produtos' },
          { id: 'guide' as const, icon: BookOpen, label: 'Como Usar' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center px-6 py-2 transition-all active:scale-90 duration-200 rounded-2xl ${
              activeTab === tab.id
                ? 'text-on-surface bg-secondary shadow-sm'
                : 'text-on-surface-variant/40 hover:text-secondary-dark'
            }`}
          >
            <tab.icon className={`w-5 h-5 mb-0.5 ${activeTab === tab.id ? '' : ''}`} />
            <span className="text-[9px] font-bold uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

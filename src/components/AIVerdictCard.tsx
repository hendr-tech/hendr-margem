import { motion } from 'motion/react';
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lightbulb,
  Rocket,
  BrainCircuit,
} from 'lucide-react';
import type { AIVerdictResult } from '../lib/aiService';

// ─── Shimmer / Loading State ─────────────────────────────

export function AIVerdictSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: 0.3 }}
      className="relative overflow-hidden rounded-3xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 via-indigo-50 to-purple-50 p-6"
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30">
          <BrainCircuit className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-black text-violet-800">Consultando IA...</p>
            <Loader2 className="w-3.5 h-3.5 text-violet-500 animate-spin" />
          </div>
          <p className="text-[9px] text-violet-600/50 font-medium uppercase tracking-wider">
            Analisando com Gemini AI
          </p>
        </div>
      </div>

      {/* Skeleton lines */}
      <div className="space-y-2.5">
        <div className="h-3 bg-violet-200/50 rounded-full w-full animate-pulse" />
        <div className="h-3 bg-violet-200/50 rounded-full w-4/5 animate-pulse" style={{ animationDelay: '150ms' }} />
        <div className="h-3 bg-violet-200/50 rounded-full w-3/5 animate-pulse" style={{ animationDelay: '300ms' }} />
      </div>
    </motion.div>
  );
}

// ─── Main AI Verdict Card ────────────────────────────────

interface AIVerdictCardProps {
  verdict: AIVerdictResult;
}

export function AIVerdictCard({ verdict }: AIVerdictCardProps) {
  const verdictConfig = getVerdictConfig(verdict.verdict);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="space-y-3"
    >
      {/* Main Card */}
      <div className={`rounded-3xl border-2 overflow-hidden ${verdictConfig.border}`}>
        {/* Header gradient */}
        <div className={`${verdictConfig.headerBg} px-6 pt-5 pb-4`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${verdictConfig.iconBg} rounded-2xl flex items-center justify-center shadow-lg ${verdictConfig.iconShadow}`}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className={`text-base font-black ${verdictConfig.titleColor}`}>
                  Parecer da IA
                </p>
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${verdictConfig.badge}`}>
                  {verdict.verdict}
                </span>
              </div>
              <p className={`text-[9px] font-medium uppercase tracking-wider ${verdictConfig.subtitleColor}`}>
                Gemini AI • Consultor de E-commerce
              </p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className={`px-6 py-4 ${verdictConfig.bodyBg}`}>
          <div className="flex gap-2.5">
            <verdictConfig.icon className={`w-5 h-5 shrink-0 mt-0.5 ${verdictConfig.iconColor}`} />
            <p className="text-xs text-on-surface leading-relaxed font-medium">
              {verdict.summary}
            </p>
          </div>
        </div>
      </div>

      {/* Tips */}
      {verdict.tips.length > 0 && (
        <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-sm border border-slate-100 space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
              Dicas da IA
            </p>
          </div>
          <div className="space-y-2">
            {verdict.tips.map((tip, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * (i + 1) }}
                className="flex gap-2.5 items-start bg-gradient-to-r from-amber-50/80 to-yellow-50/50 p-3 rounded-2xl border border-amber-100"
              >
                <span className="text-[10px] font-black text-amber-600 bg-amber-100 w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-[11px] text-on-surface leading-relaxed font-medium">
                  {tip}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Action Plan */}
      {verdict.action_plan && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50 rounded-3xl p-5 border-2 border-indigo-200 space-y-3"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Rocket className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-indigo-800">Plano de Ação</p>
              <p className="text-[8px] text-indigo-600/50 font-bold uppercase tracking-wider">
                O que fazer agora
              </p>
            </div>
          </div>
          <p className="text-xs text-indigo-900 leading-relaxed font-medium">
            {verdict.action_plan}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Verdict Visual Config ───────────────────────────────

function getVerdictConfig(verdict: string) {
  const normalized = verdict.toUpperCase().trim();

  if (normalized.includes('VALE A PENA') && !normalized.includes('NÃO')) {
    return {
      icon: CheckCircle2,
      iconColor: 'text-emerald-500',
      headerBg: 'bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-teal-500/10',
      bodyBg: 'bg-gradient-to-br from-emerald-50/50 to-green-50/50',
      border: 'border-emerald-200',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-green-600',
      iconShadow: 'shadow-emerald-500/30',
      titleColor: 'text-emerald-800',
      subtitleColor: 'text-emerald-600/50',
      badge: 'bg-emerald-100 text-emerald-700',
    };
  }

  if (normalized.includes('PODE MELHORAR') || normalized.includes('MELHORAR')) {
    return {
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
      headerBg: 'bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-orange-500/10',
      bodyBg: 'bg-gradient-to-br from-amber-50/50 to-yellow-50/50',
      border: 'border-amber-200',
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500',
      iconShadow: 'shadow-amber-500/30',
      titleColor: 'text-amber-800',
      subtitleColor: 'text-amber-600/50',
      badge: 'bg-amber-100 text-amber-700',
    };
  }

  // Default: NÃO VALE A PENA
  return {
    icon: XCircle,
    iconColor: 'text-red-500',
    headerBg: 'bg-gradient-to-r from-red-500/10 via-rose-500/10 to-orange-500/10',
    bodyBg: 'bg-gradient-to-br from-red-50/50 to-rose-50/50',
    border: 'border-red-200',
    iconBg: 'bg-gradient-to-br from-red-500 to-rose-600',
    iconShadow: 'shadow-red-500/30',
    titleColor: 'text-red-800',
    subtitleColor: 'text-red-600/50',
    badge: 'bg-red-100 text-red-700',
  };
}

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { signIn, signUp } from '../lib/supabase';
import {
  TrendingUp,
  Mail,
  Lock,
  LogIn,
  UserPlus,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'register') {
        await signUp(email, password);
        setSuccess('Conta criada! Verifique seu e-mail para confirmar.');
        setMode('login');
      } else {
        await signIn(email, password);
        // Auth state change will handle the redirect
      }
    } catch (err: any) {
      const msg = err?.message || 'Erro desconhecido';
      if (msg.includes('Invalid login')) {
        setError('E-mail ou senha incorretos.');
      } else if (msg.includes('already registered')) {
        setError('Este e-mail já está cadastrado. Faça login.');
      } else if (msg.includes('Password should be')) {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else if (msg.includes('valid email')) {
        setError('Digite um e-mail válido.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5">
      {/* Decorative Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-secondary/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1, stiffness: 400, damping: 20 }}
            className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-secondary/30"
          >
            <TrendingUp className="text-on-surface w-8 h-8" />
          </motion.div>
          <h1 className="text-3xl font-black text-on-surface tracking-tight">HendrMargem</h1>
          <p className="text-on-surface-variant text-sm mt-1">Calculadora inteligente para Mercado Livre</p>
        </div>

        {/* Card */}
        <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-xl border border-slate-100">
          {/* Mode Toggle */}
          <div className="flex bg-surface-container-low p-1 rounded-2xl mb-6">
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'login' ? 'bg-secondary text-on-surface shadow-sm' : 'text-on-surface-variant'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Entrar
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'register' ? 'bg-secondary text-on-surface shadow-sm' : 'text-on-surface-variant'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Criar Conta
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="flex items-center text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60 px-1">
                <Mail className="w-3 h-3 mr-1.5 text-secondary-dark" />
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full bg-surface-container-high/60 border border-transparent rounded-2xl py-3.5 px-4 text-base font-bold text-on-surface focus:ring-2 focus:ring-secondary focus:border-secondary focus:bg-white transition-all outline-none placeholder:text-on-surface-variant/25"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="flex items-center text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60 px-1">
                <Lock className="w-3 h-3 mr-1.5 text-secondary-dark" />
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                  required
                  minLength={6}
                  className="w-full bg-surface-container-high/60 border border-transparent rounded-2xl py-3.5 px-4 pr-12 text-base font-bold text-on-surface focus:ring-2 focus:ring-secondary focus:border-secondary focus:bg-white transition-all outline-none placeholder:text-on-surface-variant/25"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-on-surface-variant/40 hover:text-on-surface-variant transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-2xl"
                >
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs font-medium text-red-700">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-2xl"
                >
                  <Sparkles className="w-4 h-4 text-green-500 shrink-0" />
                  <p className="text-xs font-medium text-green-700">{success}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-secondary text-on-surface py-4 rounded-2xl font-black text-base shadow-xl shadow-secondary/25 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {mode === 'login' ? 'Entrando...' : 'Criando conta...'}
                </>
              ) : (
                <>
                  {mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  {mode === 'login' ? 'Entrar' : 'Criar Conta'}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-on-surface-variant/40 mt-6 font-medium">
          Seus produtos ficam salvos na nuvem ☁️
        </p>
      </motion.div>
    </div>
  );
}

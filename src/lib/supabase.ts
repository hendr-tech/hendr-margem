import { createClient } from '@supabase/supabase-js';
import type { User, Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Types ───────────────────────────────────────────────

export type { User, Session };

export interface ProductRow {
  id: string;
  user_id: string;
  name: string;
  cost: number;
  weight: number;
  ad_type: string;
  shipping_method: string;
  packaging_cost: number;
  tax_rate: number;
  ads_rate: number;
  margin_target: number;
  competitor_price: number;
  manual_price: number;
  monthly_goal: number;
  final_price: number;
  net_profit: number;
  roi: number;
  liquido_ml: number;
  is_worth_it: boolean;
  created_at: string;
}

// ─── Auth ────────────────────────────────────────────────

export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export const onAuthStateChange = (callback: (session: Session | null) => void) => {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
};

// ─── Products CRUD ───────────────────────────────────────

export const fetchProducts = async (): Promise<ProductRow[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as ProductRow[]) || [];
};

export const insertProduct = async (
  product: Omit<ProductRow, 'id' | 'user_id' | 'created_at'>
): Promise<ProductRow> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('products')
    .insert({ ...product, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as ProductRow;
};

export const deleteProduct = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

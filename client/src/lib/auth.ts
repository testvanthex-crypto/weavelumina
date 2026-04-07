import { supabase } from './supabase';

export async function register(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { user: data.user, error };
}

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { user: data.user, error };
}

export async function logout() {
  await supabase.auth.signOut();
}

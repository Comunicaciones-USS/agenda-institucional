import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const USE_SUPABASE = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// Cliente único (singleton) — null si no hay credenciales (modo demo)
export const supabase = USE_SUPABASE
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Exportamos también la URL para mostrarla en la vista de Configuración (solo lectura)
export const SUPABASE_URL_PUBLIC = SUPABASE_URL || '';

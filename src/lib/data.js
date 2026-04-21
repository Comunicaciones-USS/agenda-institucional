// ============================================================
//  DATA LAYER
//  Intenta usar Supabase si VITE_SUPABASE_* están configuradas,
//  si no cae a modo demo con localStorage.
// ============================================================

import { supabase, USE_SUPABASE } from './supabase';
import { DEMO_EVENTS, DEMO_REGISTRATIONS } from './demoData';

// Cache en localStorage para persistir cambios en modo demo
const LS_EVENTS = 'agenda_uss_events';
const LS_REGS = 'agenda_uss_regs';

function loadDemo(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return fallback;
}

function saveDemo(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { /* ignore */ }
}

// Estado en memoria (refleja localStorage en modo demo)
let _demoEvents = loadDemo(LS_EVENTS, DEMO_EVENTS);
let _demoRegs = loadDemo(LS_REGS, DEMO_REGISTRATIONS);

// Subscriptores para simular realtime en modo demo
const _listeners = new Set();
function _emit(evt) {
  _listeners.forEach((fn) => { try { fn(evt); } catch (e) { /* ignore */ } });
}

export const DataAPI = {
  mode: USE_SUPABASE ? 'supabase' : 'demo',

  async listEvents({ sede, from, to, includeDrafts } = {}) {
    if (supabase) {
      let q = supabase.from('events').select('*').order('date').order('time');
      if (!includeDrafts) q = q.eq('status', 'published');
      if (sede) q = q.eq('sede', sede);
      if (from) q = q.gte('date', from);
      if (to) q = q.lte('date', to);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    }
    // demo
    let out = [..._demoEvents];
    if (!includeDrafts) out = out.filter((e) => e.status === 'published');
    if (sede) out = out.filter((e) => e.sede === sede);
    if (from) out = out.filter((e) => e.date >= from);
    if (to) out = out.filter((e) => e.date <= to);
    return out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  },

  async upsertEvent(ev) {
    if (supabase) {
      const { data, error } = await supabase.from('events').upsert(ev).select().single();
      if (error) throw error;
      return data;
    }
    if (!ev.id) ev.id = 'e_' + Math.random().toString(36).slice(2, 10);
    const idx = _demoEvents.findIndex((e) => e.id === ev.id);
    if (idx >= 0) _demoEvents[idx] = { ..._demoEvents[idx], ...ev };
    else _demoEvents.unshift(ev);
    saveDemo(LS_EVENTS, _demoEvents);
    _emit({ table: 'events', type: idx >= 0 ? 'UPDATE' : 'INSERT', row: ev });
    return ev;
  },

  async deleteEvent(id) {
    if (supabase) {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    _demoEvents = _demoEvents.filter((e) => e.id !== id);
    saveDemo(LS_EVENTS, _demoEvents);
    _emit({ table: 'events', type: 'DELETE', row: { id } });
  },

  async listRegistrations(eventId) {
    if (supabase) {
      let q = supabase.from('registrations').select('*').order('created_at', { ascending: false });
      if (eventId) q = q.eq('event_id', eventId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    }
    let out = [..._demoRegs];
    if (eventId) out = out.filter((r) => r.event_id === eventId);
    return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async createRegistration(reg) {
    if (supabase) {
      const { data, error } = await supabase.from('registrations').insert(reg).select().single();
      if (error) throw error;
      return data;
    }
    const newReg = { id: 'r_' + Math.random().toString(36).slice(2, 10), created_at: new Date().toISOString(), ...reg };
    _demoRegs.unshift(newReg);
    saveDemo(LS_REGS, _demoRegs);
    _emit({ table: 'registrations', type: 'INSERT', row: newReg });
    return newReg;
  },

  async registrationCount(eventId) {
    if (supabase) {
      const { count, error } = await supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('event_id', eventId);
      if (error) throw error;
      return count || 0;
    }
    return _demoRegs.filter((r) => r.event_id === eventId).length;
  },

  // Subscripción a cambios en tiempo real
  subscribe(fn) {
    _listeners.add(fn);
    if (supabase) {
      const ch = supabase
        .channel('agenda_rt')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'events' },
          (payload) => fn({ table: 'events', type: payload.eventType, row: payload.new || payload.old }))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' },
          (payload) => fn({ table: 'registrations', type: payload.eventType, row: payload.new || payload.old }))
        .subscribe();
      return () => { _listeners.delete(fn); supabase.removeChannel(ch); };
    }
    return () => _listeners.delete(fn);
  },

  // Reinicio de datos demo (solo modo demo)
  resetDemo() {
    _demoEvents = [...DEMO_EVENTS];
    _demoRegs = [...DEMO_REGISTRATIONS];
    saveDemo(LS_EVENTS, _demoEvents);
    saveDemo(LS_REGS, _demoRegs);
    _emit({ table: 'events', type: 'RESET' });
  },

  // Login admin
  async login(email, password) {
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data.user;
    }
    // Demo: acepta cualquier correo con password "agenda2026"
    if (password !== 'agenda2026') throw new Error('Credenciales inválidas. Usa contraseña: agenda2026');
    return { email, role: 'editor', name: email.split('@')[0] };
  },

  async logout() {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
  },
};

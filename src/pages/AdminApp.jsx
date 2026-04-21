import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { useToast } from '../components/Toast';
import { DataAPI } from '../lib/data';
import { SUPABASE_URL_PUBLIC } from '../lib/supabase';
import { addDays, fmtDate, weekStart } from '../lib/utils';
import { CATEGORIES, SEDES } from '../constants';

// ============================================================
//  ADMIN APP — login + dashboard + CRUD + inscripciones
// ============================================================

export default function AdminApp({ onExitToPublic }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('agenda_admin_user') || 'null'); }
    catch (e) { return null; }
  });
  const [view, setView] = useState('dashboard');
  const [editingId, setEditingId] = useState(null);

  const logout = async () => {
    try { await DataAPI.logout(); } catch (e) { /* ignore */ }
    sessionStorage.removeItem('agenda_admin_user');
    setUser(null);
  };

  if (!user) {
    return (
      <Login
        onLogin={(u) => {
          sessionStorage.setItem('agenda_admin_user', JSON.stringify(u));
          setUser(u);
        }}
        onExit={onExitToPublic}
      />
    );
  }

  return (
    <div className="admin">
      <aside className="admin-side">
        <div className="brand">Agenda USS <small>Panel admin</small></div>
        <nav>
          <button className={view === 'dashboard' ? 'on' : ''} onClick={() => setView('dashboard')}><Icon n="chart" />Dashboard</button>
          <button className={view === 'events' ? 'on' : ''} onClick={() => { setView('events'); setEditingId(null); }}><Icon n="cal" />Eventos</button>
          <button className={view === 'registrations' ? 'on' : ''} onClick={() => setView('registrations')}><Icon n="users2" />Inscripciones</button>
          <button className={view === 'templates' ? 'on' : ''} onClick={() => setView('templates')}><Icon n="template" />Plantillas</button>
          <button className={view === 'settings' ? 'on' : ''} onClick={() => setView('settings')}><Icon n="settings" />Configuración</button>
        </nav>
        <div className="footer-user">
          <div className="n">{user.email || user.name}</div>
          <div className="r">{user.role || 'editor'}</div>
          <div className="flex gap-8 mt-8">
            <button className="btn ghost sm" onClick={onExitToPublic} style={{ color: '#fff', borderColor: '#ffffff33' }}>
              <Icon n="eye" size={14} />Vista pública
            </button>
            <button className="btn ghost sm" onClick={logout} style={{ color: '#fff', borderColor: '#ffffff33' }}>
              <Icon n="logout" size={14} />
            </button>
          </div>
        </div>
      </aside>
      <main className="admin-main">
        {view === 'dashboard' && <Dashboard onOpenEvent={(id) => { setEditingId(id); setView('events'); }} />}
        {view === 'events' && <EventsView editingId={editingId} setEditingId={setEditingId} />}
        {view === 'registrations' && <RegistrationsView />}
        {view === 'templates' && <TemplatesView />}
        {view === 'settings' && <SettingsView user={user} />}
      </main>
    </div>
  );
}

function Login({ onLogin, onExit }) {
  const [email, setEmail] = useState('comunicaciones@uss.cl');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const toast = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setErr(null);
    try {
      const u = await DataAPI.login(email, password);
      onLogin(u);
      toast('Bienvenido/a ' + (u.name || email), 'success');
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-brand">
        <h1>Agenda<br />USS</h1>
        <div className="sub">
          Panel de administración para el área de Comunicaciones. Ingresa la programación semanal y actualízala en tiempo real.
        </div>
        <div className="hint">UNIVERSIDAD SAN SEBASTIÁN · 2026</div>
      </div>
      <div className="login-form">
        <div className="login-form-inner">
          <h2>Iniciar sesión</h2>
          <p>Accede con tus credenciales institucionales.</p>
          <form onSubmit={submit}>
            <div className="field">
              <label>Correo institucional</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
              {DataAPI.mode === 'demo' && <div className="hint">Demo: <code>agenda2026</code></div>}
            </div>
            {err && <div className="err-msg" style={{ marginBottom: 10 }}>{err}</div>}
            <button className="btn primary block lg" disabled={loading}>
              {loading ? <><span className="spinner" /> Ingresando…</> : 'Ingresar'}
            </button>
          </form>
          <button onClick={onExit} className="btn ghost block" style={{ marginTop: 14 }}>← Volver a la vista pública</button>
        </div>
      </div>
    </div>
  );
}

// ------------- Dashboard -------------
function Dashboard({ onOpenEvent }) {
  const [events, setEvents] = useState([]);
  const [regs, setRegs] = useState([]);
  const [pulse, setPulse] = useState(0);

  const reload = useCallback(async () => {
    const [e, r] = await Promise.all([
      DataAPI.listEvents({ includeDrafts: true }),
      DataAPI.listRegistrations(),
    ]);
    setEvents(e); setRegs(r);
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    return DataAPI.subscribe(() => { reload(); setPulse((p) => p + 1); });
  }, [reload]);

  const now = new Date().toISOString().slice(0, 10);
  const wsNow = weekStart(now);
  const thisWeek = events.filter((e) => e.date >= wsNow && e.date <= addDays(wsNow, 6));
  const published = events.filter((e) => e.status === 'published').length;
  const drafts = events.filter((e) => e.status === 'draft').length;

  const regsByEvent = useMemo(() => {
    const m = {};
    regs.forEach((r) => { m[r.event_id] = (m[r.event_id] || 0) + 1; });
    return m;
  }, [regs]);
  const top = [...events].map((e) => ({ ...e, rc: regsByEvent[e.id] || 0 })).sort((a, b) => b.rc - a.rc).slice(0, 5);
  const recent = regs.slice(0, 8);

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>Dashboard</h1>
          <div className="sub">Vista general · Agenda USS {DataAPI.mode === 'supabase' ? '' : '(modo demo local)'}</div>
        </div>
        <div className="flex gap-12">
          <span className="badge live">
            <span className="dot" />En vivo · Supabase {DataAPI.mode === 'supabase' ? 'conectado' : '(demo)'}
          </span>
        </div>
      </div>
      <div className="admin-content">
        <div className="metric-grid">
          <div className="metric-card highlight">
            <div className="val">{thisWeek.length}</div>
            <div className="lbl">Eventos esta semana</div>
            <div className="sub">{fmtDate(wsNow, { short: true })} – {fmtDate(addDays(wsNow, 6), { short: true })}</div>
          </div>
          <div className="metric-card">
            <div className="val">{regs.length}</div>
            <div className="lbl">Inscripciones totales</div>
            <div className="sub" key={pulse} style={{ color: 'var(--green)' }}>↑ Actualización en vivo</div>
          </div>
          <div className="metric-card">
            <div className="val">{published}</div>
            <div className="lbl">Eventos publicados</div>
            <div className="sub">{drafts} borrador{drafts !== 1 ? 'es' : ''} pendiente{drafts !== 1 ? 's' : ''}</div>
          </div>
          <div className="metric-card">
            <div className="val">{SEDES.length}</div>
            <div className="lbl">Sedes activas</div>
            <div className="sub">Santiago, Concepción, Valdivia, Patagonia, Online</div>
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Eventos más populares</h3>
              <span className="muted tiny">Por nº de inscritos</span>
            </div>
            <table className="tbl">
              <thead>
                <tr><th>Evento</th><th>Sede</th><th>Fecha</th><th style={{ textAlign: 'right' }}>Inscritos</th></tr>
              </thead>
              <tbody>
                {top.length === 0 && (
                  <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 30 }}>Sin datos aún</td></tr>
                )}
                {top.map((e) => (
                  <tr key={e.id} onClick={() => onOpenEvent(e.id)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 500, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</td>
                    <td><span className="muted">{e.sede}</span></td>
                    <td className="muted tiny">{fmtDate(e.date)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--uss-navy)' }}>
                      {e.rc}{e.capacity ? ` / ${e.capacity}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Últimas inscripciones</h3>
              <span className="badge live"><span className="dot" />En vivo</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recent.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-3)' }}>Nadie se ha inscrito aún.</div>
              )}
              {recent.map((r) => {
                const ev = events.find((e) => e.id === r.event_id);
                const d = new Date(r.created_at);
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, border: '1px solid var(--ink-5)', borderRadius: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--uss-blue-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--uss-navy)', fontWeight: 600 }}>
                      {(r.full_name || '?').split(' ').slice(0, 2).map((w) => w[0]).join('')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{r.full_name}</div>
                      <div className="muted tiny" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        → {ev?.title || 'Evento eliminado'}
                      </div>
                    </div>
                    <div className="muted tiny">{d.getHours()}:{String(d.getMinutes()).padStart(2, '0')}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ------------- Events list + editor -------------
function EventsView({ editingId, setEditingId }) {
  const [events, setEvents] = useState([]);
  const [regCounts, setRegCounts] = useState({});
  const [filter, setFilter] = useState('week');
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const reload = useCallback(async () => {
    setLoading(true);
    const [e, r] = await Promise.all([
      DataAPI.listEvents({ includeDrafts: true }),
      DataAPI.listRegistrations(),
    ]);
    const counts = {};
    r.forEach((x) => { counts[x.event_id] = (counts[x.event_id] || 0) + 1; });
    setEvents(e); setRegCounts(counts); setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => DataAPI.subscribe(() => reload()), [reload]);

  const now = new Date().toISOString().slice(0, 10);
  const wsNow = weekStart(now);
  const filtered = useMemo(() => {
    if (filter === 'week') return events.filter((e) => e.date >= wsNow && e.date <= addDays(wsNow, 6));
    if (filter === 'next') return events.filter((e) => e.date > addDays(wsNow, 6));
    if (filter === 'draft') return events.filter((e) => e.status === 'draft');
    if (filter === 'past') return events.filter((e) => e.date < wsNow);
    return events;
  }, [events, filter, wsNow]);

  if (editingId !== null) {
    const ev = editingId === 'new' ? null : events.find((e) => e.id === editingId);
    return (
      <EventEditor
        event={ev}
        onCancel={() => setEditingId(null)}
        onSaved={() => { setEditingId(null); reload(); }}
      />
    );
  }

  const duplicatePrev = async () => {
    const lastWeek = events.filter((e) => e.date >= addDays(wsNow, -7) && e.date < wsNow && e.status === 'published');
    if (lastWeek.length === 0) { toast('No hay eventos de la semana anterior', 'info'); return; }
    if (!confirm(`Duplicar ${lastWeek.length} eventos de la semana anterior como borradores para la próxima semana?`)) return;
    for (const e of lastWeek) {
      const { id, ...rest } = e;
      await DataAPI.upsertEvent({ ...rest, date: addDays(e.date, 14), status: 'draft' });
    }
    toast(`${lastWeek.length} eventos duplicados como borrador`, 'success');
  };

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>Eventos</h1>
          <div className="sub">Crea, edita y publica la programación de la semana</div>
        </div>
        <div className="flex gap-8">
          <button className="btn ghost sm" onClick={duplicatePrev}><Icon n="copy" size={14} />Duplicar semana anterior</button>
          <button className="btn gold" onClick={() => setEditingId('new')}><Icon n="plus" size={16} />Nuevo evento</button>
        </div>
      </div>
      <div className="admin-content">
        <div className="flex gap-8" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            ['week', 'Esta semana'], ['next', 'Próximas'],
            ['draft', 'Borradores'], ['past', 'Pasados'], ['all', 'Todos'],
          ].map(([k, lbl]) => (
            <button key={k} className={`btn ${filter === k ? 'primary' : 'ghost'} sm`} onClick={() => setFilter(k)}>{lbl}</button>
          ))}
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="tbl">
            <thead>
              <tr><th>Evento</th><th>Sede</th><th>Fecha</th><th>Inscritos</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan="6" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}><span className="spinner" /> Cargando...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan="6" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>Sin eventos en esta vista</td></tr>
              )}
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div style={{ fontWeight: 500, maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                    <div className="muted tiny">{e.category} · {e.faculty}</div>
                  </td>
                  <td>{e.sede}</td>
                  <td>
                    <div>{fmtDate(e.date)}</div>
                    <div className="muted tiny">{e.time} hrs</div>
                  </td>
                  <td>
                    {e.requires_rsvp ? (
                      <>
                        <span style={{ fontWeight: 600, color: 'var(--uss-navy)' }}>{regCounts[e.id] || 0}</span>
                        {e.capacity && <span className="muted"> / {e.capacity}</span>}
                        {e.capacity && (regCounts[e.id] || 0) >= e.capacity && <span className="badge full" style={{ marginLeft: 6 }}>Lleno</span>}
                      </>
                    ) : <span className="muted tiny">Sin RSVP</span>}
                  </td>
                  <td>
                    {e.status === 'published'
                      ? <span className="badge pub"><Icon n="check" size={10} /> Publicado</span>
                      : <span className="badge draft">Borrador</span>}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn ghost sm" onClick={() => setEditingId(e.id)}><Icon n="edit" size={13} />Editar</button>
                    <button
                      className="btn ghost sm"
                      style={{ marginLeft: 4, color: 'var(--red)' }}
                      onClick={async () => {
                        if (confirm(`¿Eliminar "${e.title}"?`)) {
                          await DataAPI.deleteEvent(e.id);
                          toast('Evento eliminado', 'info');
                          reload();
                        }
                      }}
                    >
                      <Icon n="trash" size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function EventEditor({ event, onCancel, onSaved }) {
  const isNew = !event;
  const [f, setF] = useState(() => event || {
    title: '', category: CATEGORIES[0], description: '',
    date: new Date().toISOString().slice(0, 10), time: '12:00',
    sede: 'Santiago', location: '', faculty: '', capacity: '',
    requires_rsvp: true, external_url: '', tags: [], image_url: '', status: 'draft',
  });
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const upd = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const save = async (status) => {
    if (!f.title.trim()) return toast('El título es obligatorio', 'error');
    if (!f.date || !f.time) return toast('Completa fecha y hora', 'error');
    if (!f.location.trim()) return toast('Completa la ubicación', 'error');
    setSaving(true);
    try {
      const toSave = { ...f, status, capacity: f.capacity ? Number(f.capacity) : null };
      await DataAPI.upsertEvent(toSave);
      toast(status === 'published' ? 'Evento publicado' : 'Borrador guardado', 'success');
      onSaved();
    } catch (e) {
      toast('Error: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!f.tags.includes(t)) upd('tags', [...f.tags, t]);
    setTagInput('');
  };

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>{isNew ? 'Nuevo evento' : 'Editar evento'}</h1>
          <div className="sub">Los cambios se reflejan en vivo en la vista pública</div>
        </div>
        <div className="flex gap-8">
          <button className="btn ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn ghost" disabled={saving} onClick={() => save('draft')}>Guardar borrador</button>
          <button className="btn gold" disabled={saving} onClick={() => save('published')}>
            {saving ? <><span className="spinner" /> Guardando...</> : 'Publicar'}
          </button>
        </div>
      </div>
      <div className="admin-content">
        <div className="editor-grid">
          <div className="card">
            <h3>Información del evento</h3>
            <div className="field">
              <label>Título <span className="req">*</span></label>
              <input value={f.title} onChange={(e) => upd('title', e.target.value)} placeholder="Ej: Clase magistral de Inteligencia Artificial" />
            </div>

            <div className="row-2">
              <div className="field">
                <label>Categoría</label>
                <select value={f.category} onChange={(e) => upd('category', e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Sede</label>
                <select value={f.sede} onChange={(e) => upd('sede', e.target.value)}>
                  <option>Nacional</option>
                  {SEDES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="field">
              <label>Descripción</label>
              <textarea value={f.description} onChange={(e) => upd('description', e.target.value)} placeholder="Contexto del evento, organizadores, público objetivo..." rows="5" />
            </div>

            <div className="row-2">
              <div className="field">
                <label>Fecha <span className="req">*</span></label>
                <input type="date" value={f.date} onChange={(e) => upd('date', e.target.value)} />
              </div>
              <div className="field">
                <label>Hora <span className="req">*</span></label>
                <input type="time" value={f.time} onChange={(e) => upd('time', e.target.value)} />
              </div>
            </div>

            <div className="field">
              <label>Ubicación <span className="req">*</span></label>
              <input value={f.location} onChange={(e) => upd('location', e.target.value)} placeholder="Aula Magna, campus Bellavista" />
            </div>

            <div className="row-2">
              <div className="field">
                <label>Facultad u organizador</label>
                <input value={f.faculty} onChange={(e) => upd('faculty', e.target.value)} placeholder="Ej: Facultad de Economía, Negocios y Gobierno" />
              </div>
              <div className="field">
                <label>Aforo máximo</label>
                <input type="number" value={f.capacity || ''} onChange={(e) => upd('capacity', e.target.value)} placeholder="Sin límite" />
              </div>
            </div>

            <div className="row-2">
              <div className="field">
                <label>URL de imagen</label>
                <input value={f.image_url || ''} onChange={(e) => upd('image_url', e.target.value)} placeholder="https://..." />
                <div className="hint">Deja vacío para usar el placeholder institucional</div>
              </div>
              <div className="field">
                <label>Link externo (si es online)</label>
                <input value={f.external_url || ''} onChange={(e) => upd('external_url', e.target.value)} placeholder="https://zoom.us/..." />
              </div>
            </div>

            <div className="field">
              <label style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={f.requires_rsvp}
                  onChange={(e) => upd('requires_rsvp', e.target.checked)}
                  style={{ marginRight: 8, width: 'auto' }}
                />
                Requiere inscripción previa
              </label>
            </div>

            <div className="field">
              <label>Etiquetas</label>
              <div className="chip-list">
                {f.tags.map((t) => (
                  <span key={t} className="chip">
                    {t}<button onClick={() => upd('tags', f.tags.filter((x) => x !== t))}>×</button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="Agregar etiqueta + Enter"
                  style={{ flex: 1, minWidth: 120, border: 'none', background: 'transparent', padding: '6px 0', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          <div className="preview-wrap">
            <h4><Icon n="eye" size={12} /> Vista previa</h4>
            <div className="preview-phone">
              <div className="preview-screen">
                {f.image_url
                  ? <div style={{ width: '100%', aspectRatio: '16/10', backgroundImage: `url(${f.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  : <div style={{ width: '100%', aspectRatio: '16/10', background: 'linear-gradient(135deg, var(--uss-navy-2), var(--uss-navy))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--uss-gold)', fontFamily: 'var(--serif)', fontSize: 36 }}>
                      {(f.title || '?').split(' ').filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'US'}
                    </div>}
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'inline-block', fontSize: 9, fontWeight: 600, color: 'var(--uss-navy)', background: 'var(--uss-blue-soft)', padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                    {f.category}
                  </div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--uss-navy)', fontWeight: 600, lineHeight: 1.2 }}>
                    {f.title || 'Título del evento'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 8, lineHeight: 1.5 }}>
                    {f.description ? (f.description.length > 120 ? f.description.slice(0, 120) + '…' : f.description) : 'Descripción del evento aparecerá aquí.'}
                  </div>
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--ink-5)', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: 'var(--uss-navy)', fontWeight: 500 }}>
                    <div className="flex-center gap-8"><Icon n="cal" size={11} /> {fmtDate(f.date)}</div>
                    <div className="flex-center gap-8"><Icon n="clock" size={11} /> {f.time} hrs</div>
                    <div className="flex-center gap-8"><Icon n="pin" size={11} /> {f.location || 'Ubicación'}</div>
                  </div>
                  {f.requires_rsvp && (
                    <div style={{ marginTop: 12, background: 'var(--uss-navy)', color: '#fff', textAlign: 'center', padding: '8px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                      Inscríbete
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="muted tiny" style={{ textAlign: 'center', marginTop: 10 }}>Preview en vivo · así se verá</div>
          </div>
        </div>
      </div>
    </>
  );
}

// ------------- Registrations -------------
function RegistrationsView() {
  const [regs, setRegs] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [q, setQ] = useState('');
  const toast = useToast();

  const reload = useCallback(async () => {
    const [r, e] = await Promise.all([
      DataAPI.listRegistrations(),
      DataAPI.listEvents({ includeDrafts: true }),
    ]);
    setRegs(r); setEvents(e);
  }, []);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => DataAPI.subscribe((evt) => {
    if (evt.table === 'registrations' || evt.table === 'events') reload();
  }), [reload]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return regs.filter((r) => {
      if (selectedEvent !== 'all' && r.event_id !== selectedEvent) return false;
      if (!qq) return true;
      return (r.full_name + ' ' + r.email + ' ' + r.rut + ' ' + (r.career || '')).toLowerCase().includes(qq);
    });
  }, [regs, selectedEvent, q]);

  const exportCSV = () => {
    const headers = ['Evento', 'Nombre', 'Email', 'Teléfono', 'RUT', 'Tipo', 'Carrera', 'Campus', 'Comentario', 'Fecha inscripción'];
    const rows = filtered.map((r) => {
      const ev = events.find((e) => e.id === r.event_id);
      return [ev?.title || '', r.full_name, r.email, r.phone, r.rut, r.user_type, r.career || '', r.campus || '', r.comment || '', r.created_at];
    });
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `inscripciones_agenda_uss_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast(`${filtered.length} inscripciones exportadas`, 'success');
  };

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>Inscripciones</h1>
          <div className="sub">{regs.length} inscripciones totales · {filtered.length} filtradas</div>
        </div>
        <div className="flex gap-8">
          <button className="btn ghost" onClick={exportCSV}><Icon n="download" size={14} />Exportar CSV</button>
        </div>
      </div>
      <div className="admin-content">
        <div className="card" style={{ marginBottom: 16, padding: 14 }}>
          <div className="flex gap-12" style={{ flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px' }}>
              <input
                placeholder="Buscar por nombre, email, RUT..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--ink-5)', borderRadius: 6 }}
              />
            </div>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid var(--ink-5)', borderRadius: 6, minWidth: 240 }}
            >
              <option value="all">Todos los eventos</option>
              {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </div>
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="tbl">
            <thead>
              <tr><th>Participante</th><th>Contacto</th><th>Tipo</th><th>Evento</th><th>Inscrito</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan="5" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>Sin inscripciones en esta vista</td></tr>
              )}
              {filtered.map((r) => {
                const ev = events.find((e) => e.id === r.event_id);
                const d = new Date(r.created_at);
                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.full_name}</div>
                      <div className="muted tiny">{r.rut}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{r.email}</div>
                      <div className="muted tiny">{r.phone}</div>
                    </td>
                    <td>
                      <span className="muted">{r.user_type}</span>
                      <div className="muted tiny">{r.career}</div>
                    </td>
                    <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev?.title || <span className="muted">—</span>}
                    </td>
                    <td className="muted tiny">
                      {d.toLocaleDateString('es-CL')} {d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ------------- Templates -------------
function TemplatesView() {
  const templates = [
    { id: 't1', title: 'Ceremonia de Titulación', category: 'Ceremonia', description: 'Estudiantes culminan su proceso curricular con su ceremonia de titulación. Organiza <Carrera>.', location: 'Aula Magna, campus Bellavista', time: '17:00' },
    { id: 't2', title: 'Clase magistral: <Tema>', category: 'Clase magistral', description: 'Clase magistral dictada por <Expositor/a>.', location: 'Auditorio, campus Los Leones', time: '11:00' },
    { id: 't3', title: 'Taller de Liderazgo y Trabajo en Equipo', category: 'Taller', description: 'Instancia formativa orientada al trabajo colaborativo: comunicación efectiva, coordinación de roles y resolución de conflictos. Organiza Escuela de Liderazgo.', location: 'Sala E205, campus Los Leones', time: '16:30' },
    { id: 't4', title: 'Inauguración Año Académico', category: 'Ceremonia', description: 'Ceremonia solemne que marca el inicio del año académico con charla magistral.', location: 'Aula Magna', time: '11:00' },
    { id: 't5', title: 'Conversatorio / Emprende Day', category: 'Conversatorio', description: 'Conversatorio con actores del ecosistema. Organiza Dirección de Emprendimiento.', location: 'Sala A103, campus Ciudad Universitaria', time: '11:00' },
    { id: 't6', title: 'Feria de bienestar y autocuidado', category: 'Feria', description: 'Stands informativos y actividades recreativas de salud física y mental.', location: 'Patio central, campus Los Leones', time: '12:00' },
  ];
  const toast = useToast();

  const use = async (t) => {
    const now = new Date();
    const ev = {
      title: t.title, category: t.category, description: t.description,
      date: now.toISOString().slice(0, 10), time: t.time, sede: 'Santiago',
      location: t.location, faculty: '', capacity: null, requires_rsvp: true,
      tags: [], image_url: '', status: 'draft',
    };
    await DataAPI.upsertEvent(ev);
    toast('Plantilla "' + t.title + '" creada como borrador. Revísala en Eventos.', 'success');
  };

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>Plantillas</h1>
          <div className="sub">Eventos recurrentes · crea un borrador con un clic</div>
        </div>
      </div>
      <div className="admin-content">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {templates.map((t) => (
            <div key={t.id} className="card">
              <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 600, color: 'var(--uss-navy)', background: 'var(--uss-blue-soft)', padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                {t.category}
              </div>
              <h3 style={{ margin: '4px 0 8px' }}>{t.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, marginTop: 0 }}>{t.description}</p>
              <div className="muted tiny" style={{ marginTop: 8 }}>⏰ {t.time} hrs · 📍 {t.location}</div>
              <button className="btn primary block mt-16" onClick={() => use(t)}>Usar plantilla</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ------------- Settings -------------
function SettingsView({ user }) {
  const toast = useToast();
  return (
    <>
      <div className="admin-topbar">
        <div><h1>Configuración</h1><div className="sub">Conexión, usuarios y herramientas</div></div>
      </div>
      <div className="admin-content">
        <div className="grid-2">
          <div className="card">
            <h3>Conexión a base de datos</h3>
            {DataAPI.mode === 'supabase' ? (
              <>
                <div className="badge live"><span className="dot" />Supabase conectado</div>
                <div className="field mt-16">
                  <label>URL del proyecto</label>
                  <input readOnly value={SUPABASE_URL_PUBLIC} />
                </div>
                <div className="muted tiny">Cambios aplicados en la base se reflejan en vivo en la vista pública.</div>
              </>
            ) : (
              <>
                <div className="badge draft">Modo demo (localStorage)</div>
                <p className="mt-16" style={{ fontSize: 14, color: 'var(--ink-2)' }}>
                  Estás usando datos de demostración guardados localmente. Para conectar a Supabase, define las variables <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> en tu archivo <code>.env.local</code> (o en el panel de tu plataforma de deploy). Todos los cambios se guardan en tu navegador.
                </p>
                <button
                  className="btn ghost"
                  onClick={() => {
                    if (confirm('¿Restablecer datos demo?')) {
                      DataAPI.resetDemo();
                      toast('Datos de demo reiniciados', 'info');
                    }
                  }}
                >
                  Reiniciar datos demo
                </button>
              </>
            )}
          </div>

          <div className="card">
            <h3>Usuarios y roles</h3>
            <table className="tbl">
              <thead><tr><th>Correo</th><th>Rol</th></tr></thead>
              <tbody>
                <tr><td>{user.email}</td><td><span className="badge pub">{user.role || 'editor'}</span></td></tr>
                <tr><td className="muted">comunicaciones-cc@uss.cl</td><td><span className="muted">editor</span></td></tr>
                <tr><td className="muted">prensa@uss.cl</td><td><span className="muted">visualizador</span></td></tr>
              </tbody>
            </table>
            <div className="muted tiny mt-16">Gestión de roles disponible en Supabase Auth.</div>
          </div>

          <div className="card">
            <h3>Notificaciones push</h3>
            <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>Envía una notificación a las personas inscritas a un evento.</p>
            <div className="field"><label>Mensaje</label><textarea placeholder="Recordatorio: tu evento empieza en 1 hora..." /></div>
            <button className="btn primary"><Icon n="send" size={14} />Enviar prueba</button>
          </div>

          <div className="card">
            <h3>Exportaciones</h3>
            <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>Genera la agenda semanal como PDF o Excel.</p>
            <div className="flex gap-8">
              <button className="btn ghost" onClick={() => window.print()}><Icon n="download" size={14} />Exportar agenda PDF</button>
              <button className="btn ghost"><Icon n="download" size={14} />Exportar a Excel</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

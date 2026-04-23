import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon';
import Logo from '../components/Logo';
import { useToast } from '../components/Toast';
import { DataAPI } from '../lib/data';
import { addDays, fmtDate, formatRUT, validateEmail, validateRUT, weekStart } from '../lib/utils';
import { ALL_SEDES, ALL_SEDES_KEY, SEDES, USER_TYPES } from '../constants';

// ============================================================
//  PUBLIC APP — mobile first, wide on desktop
// ============================================================

function useEvents({ sede }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const data = await DataAPI.listEvents({ sede });
      setEvents(data);
      setLastUpdate(Date.now());
      setError(null);
    } catch (e) {
      setError(e.message || 'Error cargando eventos');
    } finally {
      setLoading(false);
    }
  }, [sede]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const un = DataAPI.subscribe((evt) => {
      if (evt.table === 'events') reload();
    });
    return un;
  }, [reload]);

  return { events, loading, error, reload, lastUpdate };
}

export default function PublicApp({ goToAdmin }) {
  const [view, setView] = useState(() => {
    const hash = window.location.hash;
    if (hash === '#buscar') return 'search';
    if (hash === '#mis') return 'mine';
    return 'home';
  });
  const [sede, setSede] = useState(() => localStorage.getItem('agenda_sede') || ALL_SEDES_KEY);
  const [selectedDate, setSelectedDate] = useState(() => localStorage.getItem('agenda_date') || '2026-04-13');
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [desktop, setDesktop] = useState(window.innerWidth > 900);
  const [showingInscribe, setShowingInscribe] = useState(false);
  const [myRegs, setMyRegs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('agenda_my_regs') || '[]'); } catch (e) { return []; }
  });
  const toast = useToast();

  useEffect(() => {
    const h = () => setDesktop(window.innerWidth > 900);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => { localStorage.setItem('agenda_sede', sede); }, [sede]);
  useEffect(() => { localStorage.setItem('agenda_date', selectedDate); }, [selectedDate]);

  const { events, loading, error } = useEvents({ sede: sede === ALL_SEDES_KEY ? null : sede });

  // Toast cuando llega un nuevo evento en tiempo real
  const prevCountRef = useRef(null);
  useEffect(() => {
    if (prevCountRef.current !== null && events.length > prevCountRef.current) {
      toast('Nuevo evento publicado en la agenda', 'success');
    }
    prevCountRef.current = events.length;
  }, [events.length, toast]);

  const weekEvents = useMemo(() => {
    const ws = weekStart(selectedDate);
    const we = addDays(ws, 6);
    return events.filter((e) => e.date >= ws && e.date <= we);
  }, [events, selectedDate]);

  const eventsByDay = useMemo(() => {
    const by = {};
    weekEvents.forEach((e) => { (by[e.date] = by[e.date] || []).push(e); });
    return by;
  }, [weekEvents]);

  const dayEvents = eventsByDay[selectedDate] || [];
  const selectedEvent = selectedEventId ? events.find((e) => e.id === selectedEventId) : null;

  const onInscribe = async (formData) => {
    try {
      const reg = await DataAPI.createRegistration({ event_id: selectedEventId, ...formData });
      const newMy = [...myRegs, { id: reg.id, event_id: selectedEventId }];
      setMyRegs(newMy);
      localStorage.setItem('agenda_my_regs', JSON.stringify(newMy));
      setShowingInscribe(false);
      toast('¡Te has inscrito exitosamente!', 'success');
    } catch (e) {
      toast('Error al inscribir: ' + (e.message || ''), 'error');
    }
  };

  const renderHome = () => {
    if (desktop) return (
      <DesktopWeek
        events={weekEvents}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        sede={sede}
        setSede={setSede}
        onOpen={(id) => setSelectedEventId(id)}
        loading={loading}
        error={error}
        goToAdmin={goToAdmin}
      />
    );
    return (
      <MobileHome
        events={events}
        weekEvents={weekEvents}
        eventsByDay={eventsByDay}
        dayEvents={dayEvents}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        sede={sede}
        setSede={setSede}
        onOpen={(id) => setSelectedEventId(id)}
        loading={loading}
        error={error}
        goToAdmin={goToAdmin}
      />
    );
  };

  const renderSearch = () => <SearchView events={events} onOpen={(id) => setSelectedEventId(id)} />;
  const renderMine = () => (
    <MineView
      events={events}
      myRegs={myRegs}
      onOpen={(id) => setSelectedEventId(id)}
      onRemove={(rid) => {
        const next = myRegs.filter((r) => r.id !== rid);
        setMyRegs(next);
        localStorage.setItem('agenda_my_regs', JSON.stringify(next));
        toast('Inscripción eliminada de tu lista', 'info');
      }}
    />
  );

  return (
    <div className={`pub ${desktop ? 'wide' : ''}`}>
      {view === 'home' && renderHome()}
      {view === 'search' && (
        <>
          {desktop && <DesktopTop sede={sede} setSede={setSede} hideSearch goToAdmin={goToAdmin} />}
          {!desktop && <MobileTopSimple title="Buscar" goToAdmin={goToAdmin} />}
          {renderSearch()}
        </>
      )}
      {view === 'mine' && (
        <>
          {desktop && <DesktopTop sede={sede} setSede={setSede} hideSearch goToAdmin={goToAdmin} />}
          {!desktop && <MobileTopSimple title="Mis actividades" goToAdmin={goToAdmin} />}
          {renderMine()}
        </>
      )}

      {/* Bottom nav en mobile */}
      {!desktop && (
        <div className="bnav">
          <button className={`bnav-item ${view === 'home' ? 'on' : ''}`} onClick={() => setView('home')}>
            <Icon n="home" /> <span>Inicio</span>
          </button>
          <button className={`bnav-item ${view === 'search' ? 'on' : ''}`} onClick={() => setView('search')}>
            <Icon n="search" /> <span>Buscar</span>
          </button>
          <button className={`bnav-item ${view === 'mine' ? 'on' : ''}`} onClick={() => setView('mine')}>
            <Icon n="cal" /> <span>Mis actividades</span>
            {myRegs.length > 0 && (
              <span style={{ background: 'var(--uss-gold)', color: 'var(--uss-navy)', fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 999, marginLeft: 2 }}>
                {myRegs.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Sheet de detalle de evento */}
      {selectedEvent && !showingInscribe && (
        <EventDetailSheet
          event={selectedEvent}
          isRegistered={myRegs.some((r) => r.event_id === selectedEvent.id)}
          onClose={() => setSelectedEventId(null)}
          onInscribe={() => setShowingInscribe(true)}
        />
      )}
      {selectedEvent && showingInscribe && (
        <InscribeSheet
          event={selectedEvent}
          onClose={() => setShowingInscribe(false)}
          onSubmit={onInscribe}
        />
      )}
    </div>
  );
}

function MobileTopSimple({ title, goToAdmin }) {
  return (
    <div className="pub-top">
      <div className="pub-top-row">
        <Logo variant="dark" size="md" />
        {goToAdmin && <button className="admin-btn" onClick={goToAdmin} title="Ir al panel admin">Admin</button>}
      </div>
      <h1 style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--uss-navy)', margin: '6px 0 12px', fontWeight: 600 }}>
        {title}
      </h1>
    </div>
  );
}

function DesktopTop({ sede, setSede, hideSearch, goToAdmin }) {
  return (
    <div className="pub-desk-top">
      <Logo variant="light" size="lg" withTitle />
      <div className="sedes">
        {ALL_SEDES.map((s) => (
          <button key={s} className={sede === s ? 'on' : ''} onClick={() => setSede(s)}>{s}</button>
        ))}
      </div>
      {!hideSearch && <input className="search" placeholder="Buscar eventos..." />}
      {goToAdmin && (
        <button className="admin-btn desk" onClick={goToAdmin} title="Ir al panel admin">Admin</button>
      )}
    </div>
  );
}

function MobileHome({ eventsByDay, selectedDate, setSelectedDate, sede, setSede, onOpen, loading, error, goToAdmin }) {
  const ws = weekStart(selectedDate);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(ws, i)), [ws]);

  return (
    <>
      <div className="pub-top">
        <div className="pub-top-row">
          <Logo variant="dark" size="md" />
          <div className="flex gap-8" style={{ alignItems: 'center' }}>
            {goToAdmin && <button className="admin-btn" onClick={goToAdmin} title="Ir al panel admin">Admin</button>}
            <button className="icon-btn" title="Notificaciones"><Icon n="bell" /></button>
            <button className="icon-btn" title="Menú"><Icon n="menu" /></button>
          </div>
        </div>
        <div className="sede-tabs">
          {ALL_SEDES.map((s) => (
            <button key={s} className={`sede-tab ${sede === s ? 'on' : ''}`} onClick={() => setSede(s)}>{s}</button>
          ))}
        </div>
      </div>

      {/* Day strip */}
      <div className="day-strip">
        {days.map((d) => {
          const count = (eventsByDay[d] || []).length;
          const dd = new Date(d + 'T00:00:00');
          const dow = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'][dd.getDay()];
          return (
            <button
              key={d}
              className={`day-chip ${selectedDate === d ? 'on' : ''} ${count === 0 ? 'empty' : ''}`}
              onClick={() => setSelectedDate(d)}
            >
              <span className="dow">{dow}</span>
              <span className="dom">{dd.getDate()}</span>
              <span className="count">{count > 0 ? `${count} evt` : '—'}</span>
            </button>
          );
        })}
      </div>

      <div className="pub-body">
        <div className="day-header">
          <h1>{fmtDate(selectedDate, { full: true })}</h1>
          <span className="live-pill"><span className="dot" />En vivo</span>
        </div>

        {loading && (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="ev-card" style={{ cursor: 'default' }}>
                <div className="img skeleton" />
                <div className="body" style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 10, width: 80, marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 16, width: '80%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 10, width: '50%' }} />
                </div>
              </div>
            ))}
          </>
        )}

        {error && (
          <div className="empty-state">
            <div className="emoji">😕</div>
            <h3>¡Ups!</h3>
            <p>Hubo un problema al cargar los eventos.<br />{error}</p>
          </div>
        )}

        {!loading && !error && (eventsByDay[selectedDate] || []).length === 0 && (
          <div className="empty-state">
            <div className="emoji">🗓️</div>
            <h3>No hay eventos</h3>
            <p>No hay eventos programados para esta fecha en {sede}.</p>
          </div>
        )}

        {!loading && !error && (eventsByDay[selectedDate] || []).map((ev) => (
          <EventCard key={ev.id} ev={ev} onClick={() => onOpen(ev.id)} />
        ))}
      </div>
    </>
  );
}

function EventCard({ ev, onClick }) {
  const initials = ev.title.split(' ').filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <div className="ev-card" onClick={onClick}>
      {ev.image_url
        ? <div className="img" style={{ backgroundImage: `url(${ev.image_url})` }} />
        : <div className="img placeholder">{initials}</div>}
      <div className="body">
        <div className="cat">{ev.category}</div>
        <h4 className="title">{ev.title}</h4>
        <div className="meta">
          <span><Icon n="clock" size={13} />{ev.time} hrs</span>
          <span><Icon n="pin" size={13} />{(ev.location || '').split(',')[0]}</span>
        </div>
      </div>
    </div>
  );
}

function DesktopWeek({ events, selectedDate, setSelectedDate, sede, setSede, onOpen, loading, error, goToAdmin }) {
  const ws = weekStart(selectedDate);
  const days = useMemo(() => Array.from({ length: 6 }, (_, i) => addDays(ws, i)), [ws]);
  const todayISO = new Date().toISOString().slice(0, 10);
  const evByDay = useMemo(() => {
    const by = {};
    events.forEach((e) => { (by[e.date] = by[e.date] || []).push(e); });
    return by;
  }, [events]);

  const weekLabel = useMemo(() => {
    const a = new Date(ws + 'T00:00:00');
    const b = new Date(addDays(ws, 5) + 'T00:00:00');
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${a.getDate()} al ${b.getDate()} de ${months[b.getMonth()]}`;
  }, [ws]);

  return (
    <>
      <DesktopTop sede={sede} setSede={setSede} goToAdmin={goToAdmin} />
      <div className="pub-desk-body">
        <div className="week-head">
          <div>
            <div className="muted tiny" style={{ letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Semana del</div>
            <h1>{weekLabel}</h1>
          </div>
          <div className="flex gap-8">
            <button className="btn ghost sm" onClick={() => setSelectedDate(addDays(ws, -7))}>
              <Icon n="chevron-left" size={14} />Semana anterior
            </button>
            <button className="btn ghost sm" onClick={() => setSelectedDate(addDays(ws, 7))}>
              Semana siguiente <Icon n="chevron-right" size={14} />
            </button>
            <span className="live-pill" style={{ alignSelf: 'center' }}><span className="dot" />En vivo</span>
          </div>
        </div>

        {error && <div className="empty-state"><div className="emoji">😕</div><h3>¡Ups!</h3><p>{error}</p></div>}

        <div className="week-grid">
          {days.map((d) => {
            const list = evByDay[d] || [];
            const dd = new Date(d + 'T00:00:00');
            const dow = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'][dd.getDay()];
            const isToday = d === todayISO;
            return (
              <div key={d} className="week-col">
                <div className={`week-col-head ${isToday ? 'today' : ''}`}>
                  <div className="dow">{dow}</div>
                  <div className="dom">{dd.getDate()}</div>
                  <div className="cnt">{list.length === 0 ? 'Sin eventos' : `${list.length} evento${list.length > 1 ? 's' : ''}`}</div>
                </div>
                <div className="week-col-body">
                  {list.length === 0 && !loading && (
                    <div style={{ padding: '30px 8px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>—</div>
                  )}
                  {list.map((ev) => (
                    <div key={ev.id} className="mini-ev" onClick={() => onOpen(ev.id)}>
                      <div className="t">{ev.category}</div>
                      <div className="n">{ev.title}</div>
                      <div className="h">{ev.time} · {(ev.location || '').split(',')[0]}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function SearchView({ events, onOpen }) {
  const [q, setQ] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return events.filter((e) => {
      if (filterCat && e.category !== filterCat) return false;
      if (!qq) return true;
      return (e.title + ' ' + e.description + ' ' + e.location + ' ' + (e.faculty || '') + ' ' + (e.tags || []).join(' ')).toLowerCase().includes(qq);
    });
  }, [events, q, filterCat]);
  const cats = [...new Set(events.map((e) => e.category))];

  return (
    <div className="pub-body">
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <input
          type="search"
          placeholder="Buscar por título, lugar, facultad..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ width: '100%', padding: '12px 14px 12px 40px', border: '1px solid var(--ink-5)', borderRadius: 10, fontSize: 14 }}
        />
        <div style={{ position: 'absolute', left: 12, top: 12, color: 'var(--ink-3)' }}>
          <Icon n="search" />
        </div>
      </div>
      <div className="chip-list" style={{ marginBottom: 16 }}>
        <button
          onClick={() => setFilterCat('')}
          className="chip"
          style={{ cursor: 'pointer', background: filterCat === '' ? 'var(--uss-navy)' : 'var(--paper-2)', color: filterCat === '' ? '#fff' : 'var(--ink-2)', border: 'none' }}
        >
          Todas
        </button>
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setFilterCat(c)}
            className="chip"
            style={{ cursor: 'pointer', background: filterCat === c ? 'var(--uss-navy)' : 'var(--paper-2)', color: filterCat === c ? '#fff' : 'var(--ink-2)', border: 'none' }}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="muted tiny" style={{ marginBottom: 10 }}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</div>
      {filtered.map((ev) => <EventCard key={ev.id} ev={ev} onClick={() => onOpen(ev.id)} />)}
      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="emoji">🔎</div>
          <h3>Sin resultados</h3>
          <p>Prueba con otros términos.</p>
        </div>
      )}
    </div>
  );
}

function MineView({ events, myRegs, onOpen, onRemove }) {
  const myEvents = myRegs.map((r) => {
    const e = events.find((ev) => ev.id === r.event_id);
    return e ? { ...e, regId: r.id } : null;
  }).filter(Boolean);
  const now = new Date().toISOString().slice(0, 10);
  const upcoming = myEvents.filter((e) => e.date >= now);
  const past = myEvents.filter((e) => e.date < now);

  if (myEvents.length === 0) {
    return (
      <div className="pub-body">
        <div className="empty-state">
          <div className="emoji">🗂️</div>
          <h3>Aún no te has inscrito</h3>
          <p>Explora la agenda y suma tus primeras actividades.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pub-body">
      {upcoming.length > 0 && (
        <>
          <h3 style={{ fontFamily: 'var(--serif)', color: 'var(--uss-navy)', fontSize: 18, margin: '4px 0 10px' }}>Próximas</h3>
          {upcoming.map((ev) => (
            <div key={ev.regId} style={{ position: 'relative' }}>
              <EventCard ev={ev} onClick={() => onOpen(ev.id)} />
              <button
                onClick={() => onRemove(ev.regId)}
                className="icon-btn"
                style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, background: '#fff' }}
              >
                <Icon n="x" size={14} />
              </button>
            </div>
          ))}
        </>
      )}
      {past.length > 0 && (
        <>
          <h3 style={{ fontFamily: 'var(--serif)', color: 'var(--ink-3)', fontSize: 18, margin: '20px 0 10px' }}>Pasadas</h3>
          {past.map((ev) => (
            <div key={ev.regId} style={{ opacity: 0.7 }}>
              <EventCard ev={ev} onClick={() => onOpen(ev.id)} />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function EventDetailSheet({ event, onClose, onInscribe, isRegistered }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <button className="sheet-close" onClick={onClose}><Icon n="x" /></button>
        {event.image_url
          ? <div className="detail-hero" style={{ backgroundImage: `url(${event.image_url})` }} />
          : <div className="detail-hero placeholder">
              {event.title.split(' ').filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
            </div>}
        <div className="detail-body">
          <div
            className="cat"
            style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, color: 'var(--uss-navy)', background: 'var(--uss-blue-soft)', padding: '3px 10px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}
          >
            {event.category} · {event.sede}
          </div>
          <h2>{event.title}</h2>
          <p className="detail-desc">{event.description}</p>
          <div className="detail-meta">
            <div className="detail-meta-row"><span className="ico"><Icon n="cal" size={16} /></span>{fmtDate(event.date, { full: true })}</div>
            <div className="detail-meta-row"><span className="ico"><Icon n="clock" size={16} /></span>{event.time} hrs</div>
            <div className="detail-meta-row"><span className="ico"><Icon n="pin" size={16} /></span>{event.location}</div>
            {event.faculty && <div className="detail-meta-row"><span className="ico"><Icon n="users" size={16} /></span>Organiza {event.faculty}</div>}
          </div>
          {event.requires_rsvp && (
            <div style={{ marginTop: 22 }}>
              {isRegistered ? (
                <button className="btn ghost block lg" disabled><Icon n="check" /> Ya estás inscrito</button>
              ) : (
                <button className="btn primary block lg" onClick={onInscribe}>Inscríbete</button>
              )}
            </div>
          )}
          {!event.requires_rsvp && (
            <div style={{ marginTop: 18, padding: '12px 14px', background: 'var(--paper-2)', borderRadius: 10, fontSize: 13, color: 'var(--ink-2)' }}>
              Esta actividad es de libre asistencia. No requiere inscripción previa.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InscribeSheet({ event, onClose, onSubmit }) {
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', rut: '', user_type: 'estudiante',
    career: '', campus: event.sede, comment: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const upd = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = 'Requerido';
    if (!validateEmail(form.email)) errs.email = 'Correo no válido';
    if (!form.rut.trim()) errs.rut = 'Requerido';
    else if (!validateRUT(form.rut)) errs.rut = 'RUT inválido';
    if (!form.phone.trim()) errs.phone = 'Requerido';
    if (!form.user_type) errs.user_type = 'Selecciona una opción';
    return errs;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    try { await onSubmit(form); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <button className="sheet-close" onClick={onClose}><Icon n="x" /></button>
        <div className="detail-body" style={{ paddingTop: 26 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
            Inscripción
          </div>
          <h2 style={{ margin: '2px 0 4px', fontSize: 24 }}>{event.title}</h2>
          <div className="muted tiny" style={{ marginBottom: 18 }}>
            {fmtDate(event.date, { full: true })} · {event.time} hrs
          </div>

          <form onSubmit={submit}>
            <div className={`field ${errors.full_name ? 'error' : ''}`}>
              <label>Nombre completo <span className="req">*</span></label>
              <input value={form.full_name} onChange={(e) => upd('full_name', e.target.value)} placeholder="Nombre y apellido" />
              {errors.full_name && <div className="err-msg">{errors.full_name}</div>}
            </div>

            <div className="row-2">
              <div className={`field ${errors.email ? 'error' : ''}`}>
                <label>Correo electrónico <span className="req">*</span></label>
                <input type="email" value={form.email} onChange={(e) => upd('email', e.target.value)} placeholder="nombre@uss.cl" />
                {errors.email && <div className="err-msg">{errors.email}</div>}
              </div>
              <div className={`field ${errors.phone ? 'error' : ''}`}>
                <label>Teléfono <span className="req">*</span></label>
                <input type="tel" value={form.phone} onChange={(e) => upd('phone', e.target.value)} placeholder="+56 9 ..." />
                {errors.phone && <div className="err-msg">{errors.phone}</div>}
              </div>
            </div>

            <div className="row-2">
              <div className={`field ${errors.rut ? 'error' : ''}`}>
                <label>RUT <span className="req">*</span></label>
                <input value={form.rut} onChange={(e) => upd('rut', formatRUT(e.target.value))} placeholder="12.345.678-9" />
                {errors.rut && <div className="err-msg">{errors.rut}</div>}
              </div>
              <div className={`field ${errors.user_type ? 'error' : ''}`}>
                <label>Tipo de usuario <span className="req">*</span></label>
                <select value={form.user_type} onChange={(e) => upd('user_type', e.target.value)}>
                  {USER_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
            </div>

            <div className="row-2">
              <div className="field">
                <label>Carrera / facultad</label>
                <input value={form.career} onChange={(e) => upd('career', e.target.value)} placeholder="Ej: Ingeniería Comercial" />
              </div>
              <div className="field">
                <label>Campus</label>
                <select value={form.campus} onChange={(e) => upd('campus', e.target.value)}>
                  {SEDES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="field">
              <label>Comentario (opcional)</label>
              <textarea value={form.comment} onChange={(e) => upd('comment', e.target.value)} placeholder="¿Alguna consulta o requerimiento especial?" />
            </div>

            <div className="flex gap-8 mt-16">
              <button type="button" className="btn ghost grow" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn primary grow" disabled={submitting}>
                {submitting ? <><span className="spinner" /> Enviando...</> : <>Confirmar inscripción</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

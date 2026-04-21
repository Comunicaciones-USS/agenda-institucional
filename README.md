# Agenda USS — React + Vite

Aplicación web responsive (móvil + escritorio) para la agenda institucional de la **Universidad San Sebastián**, con panel admin y conexión Supabase en tiempo real.

Migrada desde HTML+CDN a **React 18 + Vite 5 + Supabase**.

---

## 📂 Estructura del proyecto

```
agenda-uss/
├── index.html               ← punto de entrada Vite
├── package.json
├── vite.config.js
├── .env.example             ← plantilla de variables de entorno
├── .env.local               ← TUS credenciales Supabase (no se sube a git)
└── src/
    ├── main.jsx             ← bootstrap React
    ├── App.jsx              ← router público vs admin
    ├── styles.css           ← estilos institucionales USS
    ├── constants.js         ← SEDES, CATEGORÍAS, etc.
    ├── lib/
    │   ├── supabase.js      ← cliente Supabase
    │   ├── data.js          ← capa de datos (Supabase + fallback demo)
    │   ├── utils.js         ← fmtDate, validateRUT, etc.
    │   └── demoData.js      ← datos seed para modo demo
    ├── components/
    │   ├── Icon.jsx         ← icon set inline SVG
    │   └── Toast.jsx        ← provider + hook de notificaciones
    └── pages/
        ├── Splash.jsx       ← splash inicial
        ├── PublicApp.jsx    ← app pública (móvil + escritorio)
        └── AdminApp.jsx     ← panel admin completo
```

---

## 🚀 Puesta en marcha local (3 pasos)

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia `.env.example` a `.env.local` y rellena:

```bash
cp .env.example .env.local
```

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-public-key
```

> 💡 Consigue ambos valores en **Supabase → Settings → API**.
> Si dejas `.env.local` vacío, la app corre en **modo demo** con datos en `localStorage`.

### 3. Levantar el servidor de desarrollo

```bash
npm run dev
```

Abre http://localhost:5173 — la app pública carga con hot-reload.

---

## 🔐 Acceso al panel admin

- **Vista pública**: URL raíz (`/`)
- **Panel admin**: clic en el botón **"Admin"** (esquina sup. derecha) o ir a `/#admin`

Para crear tu primer usuario admin:

1. Entra a tu proyecto Supabase → **Authentication → Users → Add user**
2. Crea un correo + contraseña
3. Inicia sesión en el panel admin con esas credenciales

> 🧪 **Modo demo** (sin Supabase configurado): cualquier email + password `agenda2026`.

---

## 🗄️ Configuración inicial de Supabase

Si aún no lo has hecho:

1. Crea un proyecto en https://app.supabase.com
2. Abre **SQL Editor → New query**
3. Copia y pega el contenido de `supabase_setup.sql` (incluido en la raíz de tu repo original) → **Run**
4. Esto crea las tablas `events` y `registrations`, las RLS y habilita realtime

---

## 🌐 Despliegue a producción

### Opción A — Vercel (recomendado, 1 minuto)

1. Sube el proyecto a GitHub
2. Entra a https://vercel.com/new e importa el repo
3. Vercel detecta Vite automáticamente. Solo falta una cosa:
4. En **Environment Variables**, añade:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Clic en **Deploy** ✅

Tu app queda en `https://tu-proyecto.vercel.app`. Cada push a `main` redespliega automáticamente.

### Opción B — Netlify

1. `npm run build` → genera `dist/`
2. Drag & drop la carpeta `dist/` en https://app.netlify.com/drop
3. En **Site settings → Environment variables** añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
4. Re-deploy

### Opción C — Cualquier hosting estático

```bash
npm run build
```

Luego sube el contenido de `dist/` a:
- Cloudflare Pages
- GitHub Pages
- Supabase Storage (bucket público)
- Servidor propio USS (Apache/Nginx, sirviendo `dist/` como root)

> ⚠️ **Importante**: en hostings que no inyectan variables de entorno en build (como GitHub Pages), las variables `VITE_*` se quedan **embebidas** en el bundle JS al hacer `npm run build`. Esto está bien — son llaves públicas (`anon` key), no secretas. La seguridad real viene de las **políticas RLS** en Supabase.

---

## ⚙️ Comandos útiles

| Comando            | Qué hace                                      |
| ------------------ | --------------------------------------------- |
| `npm run dev`      | Servidor de desarrollo con hot-reload         |
| `npm run build`    | Compila a `dist/` listo para producción       |
| `npm run preview`  | Preview local del build de producción         |

---

## ✨ Funcionalidades

### App pública
- **Móvil**: tabs por sede, strip de días, cards de eventos con imagen
- **Escritorio**: vista semanal en grilla de 6 columnas (L–S)
- **Detalle de evento** con formulario de inscripción + validación de RUT chileno
- **Búsqueda** por texto + filtro por categoría
- **"Mis actividades"** persistidas localmente
- Estados: cargando (skeletons), vacío, error

### Panel admin
- **Dashboard**: métricas en vivo, top eventos, inscripciones recientes
- **Eventos**: lista con filtros + editor con preview móvil lado a lado
- **Inscripciones**: buscador + export a CSV (Excel-compatible, BOM UTF-8)
- **Plantillas**: 6 eventos recurrentes preconfigurados
- **Duplicar semana anterior** con 1 clic
- Workflow **Borrador → Publicado**

### Tiempo real (Supabase Realtime)
- Crear/editar/borrar evento → vista pública se actualiza sin recargar
- Toast "Nuevo evento publicado" al llegar evento en vivo
- Contador de inscripciones se actualiza en vivo en el dashboard

---

## 🎨 Identidad visual

- **Paleta**: azul marino USS (`#0F2A44`) + dorado institucional (`#D4B574`)
- **Tipografía**: Cormorant Garamond (títulos serif) + Inter (UI)

---

## 🛟 Troubleshooting

| Problema | Solución |
| --- | --- |
| **Build OK pero al abrir veo "modo demo"** | Las variables `VITE_*` no llegaron al build. Verifica que estén en el panel del hosting **antes** del build. Re-despliega. |
| **Error de RLS al guardar evento** | Verifica que estés autenticado en el panel admin (las policies requieren `auth.uid() is not null`). |
| **Inscripciones no llegan a Supabase** | Revisa que el SQL esté completo, especialmente la policy `regs_public_insert`. |
| **El contenido no se actualiza en vivo** | Confirma que `supabase_realtime` incluye las tablas (última sentencia del SQL). |
| **Dev server falla al iniciar** | Asegúrate de tener Node ≥ 18. Borra `node_modules` y `npm install` de nuevo. |

Si algo falla, abre la consola del navegador (F12) y revisa errores.

---

## 📝 Notas de la migración

Esta versión migra el proyecto original (HTML + scripts CDN) a un setup moderno:

- React 18 vía npm (sin más CDN)
- Bundling con Vite (más rápido, hot-reload, tree-shaking)
- `@supabase/supabase-js` como dependencia npm
- Variables de entorno seguras vía `import.meta.env`
- Componentes modularizados: cada vista en su propio archivo
- ESM imports en lugar de globals (`window.X`)

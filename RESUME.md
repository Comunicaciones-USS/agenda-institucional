# 🔖 Punto de retorno — Bug del badge estirado (23 abril 2026)

## Estado
Bug abierto: badges de estado ("PUBLICADO" en Eventos, 
"AUTHENTICATED" en Configuración) se pintan como barra vertical larga 
en lugar de pill compacto cuando la tabla admin tiene pocas filas.

## Reproducción
1. Login admin con credenciales Supabase
2. Ir a Eventos → con 1 solo evento → columna ESTADO muestra barra verde
3. Mismo bug en Configuración → "Usuarios y roles" (badge AUTHENTICATED)

## Intentos fallidos (ya en main)
Hubo 2 fixes que llegaron a main y 1 intento local que se descartó. 
Ninguno resolvió el bug. Revisar los últimos commits de styles.css 
con `git log --oneline src/styles.css`.

## Próximo paso al retomar

**NO aplicar más parches a ciegas.** 

1. Revertir los fixes fallidos de main para dejar CSS limpio.
2. Diagnóstico en DevTools:
   - Abrir Eventos con 1 evento
   - Click derecho sobre el área verde → Inspeccionar
   - Panel Computed: anotar height real de span.badge, td, tr, 
     tbody, table.tbl, div.card
   - Prueba clave: desactivar la regla `background` de `.badge.pub` 
     en DevTools. Si el verde desaparece → problema es el span.badge. 
     Si el verde permanece → el color viene de otro selector/elemento.
3. Mandar capturas de DevTools a Claude (chat web) con datos reales.

## Pendiente cuando el bug se resuelva
- [ ] Prompt #4 — Upload de imágenes con compresión. Bucket 
      event-images debe crearse en Supabase Storage antes.

## Comandos útiles
```bash
# Ver estado
git status && git log --oneline -5

# Levantar dev server
npm run dev

# Ir a admin
# → click "Admin" en esquina superior derecha, o navegar a /#admin
# Login: comunicaciones@uss.cl / (tu password de Supabase)
```

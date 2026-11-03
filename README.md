# Demon-Snike · Arena de Serpientes

Juego web tipo *snake.io* con estética oscura (glassmorphism), pensado para móvil y PC como **PWA** (funciona sin conexión e instalable).

🔗 Repositorio: <https://github.com/devcarlos-code/demon-snike>

---

## Cómo jugar

1. Abre el juego (ver **Ejecución** abajo).
2. Pulsa **JUGAR** para una partida de **Supervivencia**, o entra en **CAMPAÑA** y elige un nivel desbloqueado.
3. Controla tu serpiente y usa tus **4 habilidades** para sobrevivir a oleadas cada vez más duras.
4. Combina dos habilidades seguidas para desbloquear **combos**.

### Controles
| Plataforma | Movimiento | Habilidades |
| --- | --- | --- |
| **PC** | Ratón | Teclas / botones en pantalla |
| **Móvil** | Joystick táctil | Botones en pantalla |

---

## Características

- **Modos**: Supervivencia (endless) y Campaña (100 niveles con jefes cada 8).
- **Arsenal** de 20 habilidades con mecánicas propias (campos persistentes, meteoros, conos, cadenas, etc.) repartidas en tiers: Inicial, Común, Rara, Épica, Legendaria y Mítica.
- **Combos** al encadenar habilidades.
- **Economía**: monedas, fragmentos y **maestrías** (mejora cada habilidad hasta 5/5).
- **Pieles** desbloqueables con anatomía propia.
- **Logros** persistentes con recompensa.
- **Ajustes** separados por secciones: *Rendimiento, Pantalla, Audio y Accesibilidad* (calidad gráfica, partículas, sacudida, FPS, minimapa, alto contraste, volumen de música y efectos, reducir movimiento).
- **Audio sintetizado** con Web Audio API (música generativa + efectos), sin archivos externos.
- **PWA**: instalable y con soporte offline mediante Service Worker.

El progreso (monedas, habilidades, maestrías, logros, campaña) se guarda en `localStorage` del dispositivo.

---

## Estructura

```
demon-snike/
├─ index.html                     # Redirección a outputs/
├─ outputs/
│  ├─ index.html                  # Juego completo (HTML + CSS + JS en un solo archivo)
│  ├─ service-worker.js           # Caché de la PWA (versión manual)
│  ├─ auth.js                     # Inicio de sesión con Supabase
│  ├─ manifest.webmanifest        # Metadatos de instalación
│  ├─ icon.svg                    # Icono de la app
│  └─ LEEME.txt                   # Notas internas del proyecto
└─ work/
   ├─ game-script-check.js        # JS extraído del juego para validar sintaxis
   └─ *.ps1                       # Parches históricos (no se usan en producción)
```

El juego está en un **único archivo** (`outputs/index.html`) para simplificar su despliegue.

---

## Ejecución

El juego necesita servirse por **HTTP/HTTPS** (el Service Worker no funciona abriendo el archivo directamente).

```bash
# Desde la carpeta outputs/
python -m http.server 8000
# Luego abre http://localhost:8000/
```

También puedes publicar la carpeta `outputs/` en cualquier hosting estático (GitHub Pages, Netlify, Vercel…).

Después de publicar, añade el dominio en **Authentication → URL Configuration** de Supabase.
El botón de Google requiere activar Google en **Authentication → Providers** y configurar sus credenciales OAuth.

---

## Desarrollo

- **JavaScript de validación**: `work/game-script-check.js` se regenera extrayendo el bloque `<script>` de `outputs/index.html` y comprobando su sintaxis con Node.js:

```bash
node -e "const fs=require('fs');const h=fs.readFileSync('outputs/index.html','utf8');const i=h.lastIndexOf('<script>');const j=h.indexOf('</script>',i);const s=h.slice(i+8,j);fs.writeFileSync('work/game-script-check.js',s);new Function(s);console.log('OK',s.split('\n').length)"
```

- **Cada vez que modifiques `outputs/index.html`**, incrementa la versión de la caché en `outputs/service-worker.js`:

```js
const CACHE = 'arena-serpientes-v124'; // ← sube el número
```

Así los usuarios reciben los cambios en lugar de la versión cacheada.

---

## Tecnología

HTML5 · CSS (Grid/Flexbox, `clamp()`, `backdrop-filter`) · JavaScript (Canvas 2D) · Web Audio API · Service Worker + Web App Manifest (PWA).

---

## Estado / pendientes

- Login con Supabase activado en `outputs/auth.js` (correo/contraseña y botón de Google).
- El progreso del juego sigue guardándose localmente por ahora; la sincronización de partidas requiere una tabla y políticas RLS adicionales.
- La tienda tiene catálogo en dos columnas, búsqueda y filtro por rango.
- El arsenal permite arrastrar habilidades desbloqueadas entre los cuatro espacios activos.
- El diagnóstico de runtime captura errores JavaScript, promesas rechazadas y fallos del ciclo con ID, severidad, estado, modo, nivel, última acción y traza. Deduplica incidentes, protege el progreso pausando solo cuando la arena no es segura y permite copiar o descargar reportes sin incluir tokens.
- Sin sistema de migración de datos entre dispositivos.

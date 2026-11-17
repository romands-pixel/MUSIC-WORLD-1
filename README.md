# MUSIC WORLD

Descubre y escucha música de Bandcamp (artistas de muchos países) con sus reproductores oficiales.

## Cómo funciona (y límites reales)
- **Bandcamp no ofrece una API pública de búsqueda.** El servidor (`server.js`) consulta la página pública `bandcamp.com/search` y extrae resultados (título, artista, portada, enlace, ID). Si Bandcamp cambia su HTML, hay que ajustar `parseResults`.
- **Reproducción**: se usa el reproductor oficial (`bandcamp.com/EmbeddedPlayer/...`). Reproduce lo que el artista permite: canción completa o fragmento si no la libera. No se descarga ni extrae audio.
- **El iframe de Bandcamp no expone API JavaScript.** Por eso: el play/pausa, la barra de progreso y el volumen son los del propio reproductor de Bandcamp (el volumen también se controla con el del dispositivo); la app no puede saber cuándo termina una canción. ⏮ ⏭ ⤮ (aleatorio) y ⟲ (al llegar al final de la lista vuelve al inicio) cambian el elemento cargado; hay que pulsar play en el reproductor.
- Favoritos, biblioteca, listas e historial se guardan en el navegador (localStorage).

## Instalar y ejecutar
Requiere Node.js 18 o superior.
```
npm install
npm start
```
Abre http://localhost:3000

## Desplegar en Render
1. Sube la carpeta a un repositorio de GitHub.
2. En render.com: **New → Web Service** y elige el repositorio.
3. Runtime **Node**, Build Command `npm install`, Start Command `npm start` (o usa `render.yaml`, "Blueprint").
4. Plan Free y **Create Web Service**. Render define `PORT` automáticamente.
5. Abre la URL `https://tu-app.onrender.com`. En el plan gratuito la primera visita tras inactividad tarda ~1 minuto.

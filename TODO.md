# Side B — TODO

Lista viva de errores, mejoras e ideas para próximas sesiones.

## Bugs / ajustes

- [ ] Revisar el comportamiento visual de Compact al entrar y salir de pantalla completa.
- [ ] Probar exhaustivamente el drag and drop del Mix-Tape entre distintas páginas.
- [ ] Revisar canciones con metadatos ausentes o inconsistentes (`Unknown artist`, álbum desconocido, etc.).

## Mejoras

- [x] Agregar un switch de modo claro/oscuro en la zona inferior del reproductor central.
- [x] Diseñar una paleta nocturna retro que conserve contraste, legibilidad, portadas y los acentos amarillo/naranja de Side B.
- [x] Persistir la preferencia de tema entre sesiones.
- [ ] Evaluar una tercera opción para seguir automáticamente la apariencia de macOS.
- [ ] Permitir agregar canciones individuales desde Tapes al Mix-Tape mediante doble clic.
- [ ] Permitir arrastrar canciones individuales desde la biblioteca y soltarlas en el Mix-Tape.
- [ ] Animar los cambios naturales de canción: congelar los rodillos, extraer el cassette hacia delante y arriba a la izquierda, e insertar el nuevo desde la derecha.
- [ ] Mantener esa animación como un efecto exclusivamente visual: el audio cambia instantáneamente, no altera Smart Fade/MIXING y no se ejecuta en cambios manuales.
- [ ] Optimizar el caché de portadas para no guardar repetida la misma imagen Base64 en cada pista de SQLite.
- [ ] Mostrar un resumen detallado después de importar playlists: pistas vinculadas, ausentes y descartadas.
- [ ] Permitir actualizar una importación de Apple Music conservando cambios hechos dentro de Side B.
- [ ] Mejorar la búsqueda de Files para incluir también nombres de archivos, no solamente carpetas.
- [ ] Recordar la última selección y el estado expandido de Files/Tapes entre sesiones.

## Reproductor

- [ ] Reemplazar el botón Shuffle por un switch de tres posiciones o una perilla: `OFF / SHUFFLE / RADIO`.
- [ ] En `OFF`, respetar el orden manual del Mix-Tape; en `SHUFFLE`, usar reproducción aleatoria; en `RADIO`, activar recomendaciones infinitas.
- [ ] Al activar Radio, vaciar la cola actual del Mix-Tape y mostrar únicamente la próxima canción recomendada.
- [ ] Añadir controles `+ / −` sobre la recomendación siguiente: `+` aumenta su afinidad/probabilidad futura y `−` la descarta inmediatamente y busca otra recomendación.
- [ ] Tratar el voto positivo como preferencia explícita y el negativo como rechazo explícito, separados de reproducciones y skips implícitos.
- [ ] Crear un modo Radio/infinito que genere continuamente la próxima canción según preferencias, contexto, variedad y compatibilidad musical.
- [ ] Preparar cada recomendación con anticipación para que Smart Fade pueda analizarla y enlazarla.
- [ ] Incorporar penalización por fatiga, skips tempranos y reproducciones recientes, manteniendo una cuota de descubrimiento.
- [ ] Explorar variantes de Radio: My Radio, From This Song, From This Artist, Work Mode, Deep Cuts, Rediscover y Smart Mix.
- [ ] Registrar la reacción a cada recomendación para retroalimentar el perfil sin interpretar la reproducción automática como gusto explícito.
- [ ] Agregar un botón de Like justo encima del reloj de tiempo actual; definir más adelante su icono y estados visuales.
- [ ] Persistir el Like como una señal explícita del perfil de preferencias y permitir deshacerlo.
- [ ] Definir si Shuffle debe terminar, repetir indefinidamente o mantener un historial sin repeticiones.
- [ ] Guardar y restaurar el Mix-Tape actual al reiniciar Side B.
- [ ] Guardar posición de reproducción y canción actual entre sesiones.
- [ ] Evaluar ReplayGain o normalización de volumen entre canciones.
- [ ] Agregar configuración para duración e intensidad de Smart Fade.
- [ ] Mejorar Smart Fade con análisis de BPM, beat grid y puntos musicales de entrada/salida.
- [ ] Cachear persistentemente los análisis de silencio, volumen y BPM.

## Playlists / Tapes

- [ ] Crear playlists manualmente desde Side B.
- [ ] Renombrar playlists.
- [ ] Añadir y quitar canciones de una playlist.
- [ ] Reordenar canciones dentro de una playlist y persistir el orden.
- [ ] Crear playlists desde el Mix-Tape actual.
- [ ] Exportar playlists de Side B.
- [ ] Evaluar carpetas o agrupaciones de playlists.
- [ ] Mantener las Smart Playlists de Apple Music fuera de la importación hasta definir su comportamiento.

## Biblioteca

- [ ] Detectar archivos borrados durante Scan y limpiar sus referencias de playlists de forma visible.
- [ ] Mostrar progreso durante bibliotecas o reescaneos grandes.
- [ ] Permitir registrar más de una carpeta raíz.
- [ ] Detectar duplicados por contenido además de la ruta del archivo.
- [ ] Evaluar observación automática de cambios en la biblioteca, además del botón Scan.

## Distribución

- [ ] Regenerar el DMG con todos los cambios recientes.
- [ ] Firmar y notarizar la aplicación para distribuirla fuera de esta Mac.
- [ ] Definir estrategia de actualizaciones de Side B.

## Ideas futuras

- [ ] Ecualizador visual y presets inspirados en reproductores portátiles clásicos.
- [ ] Temas o modelos alternativos de cassette.
- [ ] Visualización opcional de espectro/VU meters.
- [ ] Atajos de teclado configurables.
- [ ] Integración más profunda con las teclas multimedia y controles remotos.

## Completado

- [x] Incorporar Vitest con cobertura inicial para reproducción, Mix-Tape, SQLite, telemetría e importación de Apple Music.
- [x] Reorganizar el proyecto por controladores, vistas, servicios, repositorios y límites IPC documentados.
- [x] Registrar localmente eventos de reproducción para recomendaciones futuras.
- [x] Importar estadísticas agregadas de escucha disponibles en el XML de Apple Music.
- [x] Persistir la biblioteca y su índice lógico en SQLite.
- [x] Reescanear recursivamente la carpeta registrada mediante Scan.
- [x] Navegar por Files, Songs, Artists y Albums.
- [x] Importar playlists normales desde el XML de Apple Music.
- [x] Excluir Smart Playlists y colecciones internas de Apple Music.
- [x] Integración con Now Playing y controles multimedia de macOS.
- [x] Smart Fade inicial con detección de inicio y fin de transición.
- [x] Reordenamiento manual del Mix-Tape mediante drag and drop.

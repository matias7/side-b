# Side B — TODO

Lista viva de errores, mejoras e ideas para próximas sesiones.

## Bugs / ajustes

- [ ] Probar exhaustivamente el drag and drop del Mix-Tape entre distintas páginas.
- [ ] Revisar canciones con metadatos ausentes o inconsistentes (`Unknown artist`, álbum desconocido, etc.).

## Mejoras

- [x] Agregar un switch de modo claro/oscuro en la zona inferior del reproductor central.
- [x] Diseñar una paleta nocturna retro que conserve contraste, legibilidad, portadas y los acentos amarillo/naranja de Side B.
- [x] Persistir la preferencia de tema entre sesiones.
- [ ] Evaluar una tercera opción para seguir automáticamente la apariencia de macOS.
- [x] Permitir reemplazar la canción actual desde Tapes mediante doble clic sin alterar el resto del Mix-Tape.
- [x] Permitir arrastrar canciones individuales desde la biblioteca y soltarlas en el Mix-Tape.
- [ ] Animar los cambios naturales de canción: congelar los rodillos, extraer el cassette hacia delante y arriba a la izquierda, e insertar el nuevo desde la derecha.
- [ ] Mantener esa animación como un efecto exclusivamente visual: el audio cambia instantáneamente, no altera Smart Fade/MIXING y no se ejecuta en cambios manuales.
- [ ] Optimizar el caché de portadas para no guardar repetida la misma imagen Base64 en cada pista de SQLite.
- [ ] Mostrar un resumen detallado después de importar playlists: pistas vinculadas, ausentes y descartadas.
- [ ] Permitir actualizar una importación de Apple Music conservando cambios hechos dentro de Side B.
- [ ] Mejorar la búsqueda de Files para incluir también nombres de archivos, no solamente carpetas.
- [ ] Recordar la última selección y el estado expandido de Files/Tapes entre sesiones.
- [x] Añadir feedback háptico del trackpad de macOS al presionar controles interactivos mediante un puente nativo a `NSHapticFeedbackManager`.
- [x] Añadir feedback háptico sutil al entrar en hover sobre botones, con debounce/rate limit para evitar vibraciones repetitivas.
- [x] Ofrecer una preferencia persistente para desactivar completamente el feedback háptico, con fallback silencioso en sistemas no compatibles.

## Reproductor

- [x] Reemplazar el botón Shuffle por un selector de tres posiciones: `OFF / SHUFFLE / RADIO`, dejando Radio visible pero deshabilitado hasta implementar recomendaciones.
- [x] En `OFF`, respetar el orden manual del Mix-Tape y en `SHUFFLE` usar reproducción aleatoria.
- [x] Al activar Radio, vaciar la cola actual del Mix-Tape y mostrar únicamente la próxima canción recomendada.
- [x] Añadir controles `+ / −` sobre la recomendación siguiente: `+` aumenta su afinidad/probabilidad futura y `−` la descarta inmediatamente y busca otra recomendación.
- [x] Tratar el voto positivo como preferencia explícita y el negativo como rechazo explícito, separados de reproducciones y skips implícitos.
- [x] Crear un modo Radio/infinito que genere continuamente la próxima canción según preferencias, contexto, variedad y compatibilidad musical.
- [x] Preparar cada recomendación con anticipación para que Smart Fade pueda analizarla y enlazarla.
- [x] Incorporar penalización por fatiga, skips tempranos y reproducciones recientes, manteniendo una cuota de descubrimiento.
- [ ] Explorar variantes de Radio: My Radio, From This Song, From This Artist, Work Mode, Deep Cuts, Rediscover y Smart Mix.
- [ ] Crear un prototipo de `Radio Host` que genere una intervención breve en texto y la muestre debajo de la próxima canción recomendada del Mix-Tape.
- [ ] Diseñar `Radio Host` como un director editorial, no como un lector de metadata: investigar hechos, seleccionar una conexión relevante y recién entonces narrar la transición.
- [ ] Buscar conexiones narrativas verificables entre la canción saliente y la siguiente: influencias, colaboraciones, productores, estudios, sellos, samples, covers, composición, época, estilo, energía o contraste deliberado.
- [ ] Exigir que cada afirmación factual provenga de evidencia recuperada y conserve sus fuentes; el modelo puede narrar los hechos pero no inventar información para completar una transición.
- [ ] Permitir explícitamente que el locutor permanezca en silencio cuando no exista una conexión suficientemente precisa, interesante, novedosa y oportuna.
- [ ] Variar el formato editorial entre puente narrativo, presentación breve, dato sorprendente, cambio de época/atmósfera, continuidad musical y silencio, evitando plantillas repetitivas como “ahora escucharemos…”.
- [ ] Mantener memoria editorial en SQLite de intervenciones, entidades, temas, hechos y fuentes utilizados para evitar repetir anécdotas, artistas y estructuras narrativas recientes.
- [ ] Evaluar la calidad editorial antes de añadir voz: relevancia, naturalidad, novedad, oportunidad y duración aproximada de 10–20 segundos.
- [ ] Añadir feedback específico para el locutor: positivo, genérico, irrelevante, repetido, demasiado largo y factualmente incorrecto; tratar la incorrección como una señal grave separada del gusto.
- [ ] Generar el texto del locutor con Apple Foundation Models mediante un helper nativo, usando únicamente metadatos e historial local cuando no haya búsquedas externas habilitadas.
- [ ] Permitir que el locutor consulte información musical externa mediante herramientas controladas, mostrando fuentes, usando caché y requiriendo consentimiento antes de enviar consultas a Internet.
- [ ] Abstraer la síntesis detrás de un `SpeechSynthesisProvider`, comenzando con `AVSpeechSynthesizer` y permitiendo incorporar posteriormente motores TTS de mayor expresividad.
- [ ] Añadir la locución de Radio con planificación anticipada, ducking de la música, cancelación segura y coordinación con Smart Fade sin retrasar el cambio de canción.
- [x] Registrar la reacción a cada recomendación para retroalimentar el perfil sin interpretar la reproducción automática como gusto explícito.
- [x] Reemplazar el antiguo botón Shuffle de la botonera por un botón Like con estado visual.
- [x] Persistir localmente el Like como señal explícita, registrar `liked` / `unliked` y permitir deshacerlo.
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
- [ ] Extraer la presentación completa del cassette a una interfaz común, desacoplada del motor de reproducción y de la cola.
- [ ] Definir un `Single Cassette` basado en la implementación actual: una canción por cinta y el avance visual calculado sobre esa canción.
- [ ] Definir un `Album Cassette`: una cinta representa el álbum completo, conserva su posición entre pistas y se desenrolla según el progreso acumulado del disco.
- [ ] Permitir temas o modelos visuales alternativos implementados sobre la misma interfaz de cassette.
- [ ] Determinar cómo se selecciona el tipo de cassette y qué sucede al reproducir canciones sueltas, álbumes incompletos o una playlist.
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

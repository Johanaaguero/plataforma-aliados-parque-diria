# Presentación global de SIGTAD

El rediseño conserva los estados, handlers, servicios, rutas y contratos existentes. Los cambios de comportamiento pertenecen exclusivamente a los nuevos componentes visuales de tema e información institucional. No se añadieron dependencias al proyecto.

## Archivos y responsabilidades

| Archivo | Cambio |
| --- | --- |
| `src/index.css` | Tokens de tema, vidrio esmerilado, contraste, botones, foco, transiciones, fondos de catálogos y estilos Leaflet. |
| `src/components/ui/tema.ts` | Preferencia de apariencia, resolución automática y aplicación al documento. |
| `src/components/ui/TemaInterfaz.tsx` | Selector independiente de tema. |
| `src/components/informativo/MapaParque.tsx` | Mapa interactivo del inicio con las dependencias Leaflet existentes. |
| `src/components/informativo/SobreParque.tsx` | Vista institucional en un diálogo nativo independiente de la navegación de la aplicación. |
| `src/components/informativo/contenidoParque.ts` | Textos institucionales compartidos con Inicio y fotografías existentes. |
| `src/components/informativo/general.tsx` | Referencias a los textos compartidos; carrusel y sus estados conservados. |
| `src/components/informativo/Navbar.tsx`, `Footer.tsx` | Atributos visuales de apertura de la vista institucional; callbacks y enlaces originales conservados. |
| `src/App.tsx` | Clase de fondo de los catálogos e inclusión del mapa en Inicio. |
| `src/main.tsx` | Montaje independiente del tema y del diálogo institucional. |
| `index.html` | Idioma español, título y metadatos de presentación. |

## Apariencia

El modo **Automático** sigue `prefers-color-scheme` del dispositivo y reacciona a sus cambios. Si el navegador no informa una preferencia, utiliza la hora local: oscuro entre las 18:00 y las 06:00; claro durante el día. El selector permite fijar Claro u Oscuro y guarda únicamente `sigtad:preferencia-tema` en `localStorage`. No modifica los datos de autenticación. La apariencia sigue funcionando durante la visita si el almacenamiento está bloqueado.

Los tokens `--sigtad-*` concentran superficies, texto, bordes, sombras, estados y foco. La capa CSS adapta las utilidades existentes y mantiene sus tamaños, radios, fuentes e iconos. Para nuevas superficies se pueden reutilizar:

- `sigtad-glass`: superficie translúcida con borde y sombra.
- `sigtad-heading`, `sigtad-muted`: texto principal y secundario.
- `sigtad-button-primary`, `sigtad-button-secondary`: acciones con contraste en ambos temas.
- `sigtad-catalogo`: fondo temático difuminado mediante un pseudo-elemento decorativo.

El desenfoque no se aplica al contenedor de los módulos: hacerlo crearía un bloque de referencia distinto para los modales de posición fija. Las preferencias de movimiento reducido, transparencia reducida y colores forzados tienen reglas específicas. No se filtran ni invierten las fotografías o los mosaicos del mapa.

## Sobre el parque y ubicación

“Sobre el parque” abre únicamente los textos de “Conoce nuestro parque” y fotografías institucionales. El diálogo admite cierre con botón, fondo y Escape; conserva el foco y restaura el desplazamiento al cerrar. No añade rutas ni cambia `seccionActual`.

El mapa señala la **casona / puesto de guardaparques**, coordenadas `10.17288, -85.59401`, identificada en [cartografía de OpenStreetMap publicada por Mapcarta](https://mapcarta.com/W402781690). El contexto de ubicación y acceso por Arado corresponde a [SINAC](https://www.sinac.go.cr/ES/ac/act/pndiria/Paginas/default.aspx). El mapa conserva la atribución OpenStreetMap, permite ampliar y desplazar, y no captura la rueda del ratón durante la lectura. Incluye un enlace de indicaciones y otro a la información oficial.

## Verificación

```powershell
cd frontend
npm.cmd run build
npm.cmd run lint
```

El lint global ya tenía siete errores de reglas de hooks en `src/components/login.tsx`; este archivo no fue modificado. Los archivos nuevos y modificados por el rediseño se comprueban por separado.

Se compararon 97 archivos protegidos y 1510 registros de sintaxis de fuentes existentes contra una captura tomada antes del rediseño: sin cambios en servicios, backend, estados, efectos, handlers o contratos JSX existentes.

Las comprobaciones de navegador utilizan Playwright, Edge y Axe con respuestas API de prueba. Cubren ambos temas, persistencia y cambios de preferencia del sistema, navegación institucional, mapa, catálogos, formularios y modales, además de anchos de 320, 375, 768 y 1440 px. No envían formularios ni modifican datos de la aplicación. La regla de contraste de texto automatizada complementa la inspección visual; no constituye una certificación completa de accesibilidad.

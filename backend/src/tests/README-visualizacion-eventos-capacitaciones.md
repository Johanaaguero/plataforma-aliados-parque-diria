# Visualización de eventos y capacitaciones

El catálogo público consume las entidades y migraciones existentes de `EventosCapacitaciones`. No requiere cambios de esquema. El endpoint anterior `/api/eventos-capacitaciones` conserva su respuesta de arreglo para los consumidores administrativos existentes.

## API pública

### `GET /api/eventos`

Solo lista actividades con estado `publicado`. No requiere autenticación.

| Parámetro opcional | Valores y comportamiento |
| --- | --- |
| `buscar` | Texto de hasta 150 caracteres, sin espacios exteriores. Busca dentro del nombre sin distinguir mayúsculas. `%` y `_` son caracteres literales. |
| `temporada` | `seca` o `lluviosa`. |
| `tipoActividad` | `evento` o `capacitacion`, para las pestañas del catálogo. |
| `pagina` | Entero positivo, predeterminado `1`. La página y su desplazamiento deben ser enteros seguros. |

Ejemplo: `/api/eventos?buscar=bosque&temporada=seca&pagina=1`.

```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "nombre": "Recorrido del bosque",
      "descripcion": "Actividad de educación ambiental.",
      "fecha": "2099-12-20",
      "hora": "10:30:00",
      "lugar": "Parque Nacional Diriá",
      "tipoActividad": "evento",
      "temporada": "seca",
      "estado": "publicado",
      "cupoMaximo": 25,
      "cuposDisponibles": 25,
      "createdAt": "2099-01-01T00:00:00.000Z",
      "updatedAt": "2099-01-01T00:00:00.000Z"
    }
  ],
  "paginacion": { "pagina": 1, "limite": 9, "total": 1, "totalPaginas": 1 },
  "conteos": { "todos": 1, "eventos": 1, "capacitaciones": 0 }
}
```

La respuesta contiene como máximo nueve actividades por página, ordenadas por fecha, hora e ID ascendente para resolver empates. `paginacion.total` corresponde al filtro completo. `conteos` aplica nombre y temporada antes del filtro de tipo de actividad, de modo que las pestañas conservan sus totales. Un catálogo vacío tiene `data: []`, `total: 0` y `totalPaginas: 0`. Una página posterior al último resultado devuelve un arreglo vacío y conserva el total real.

### `GET /api/eventos/:id`

Devuelve `{ "ok": true, "data": { ... } }` con los mismos campos públicos de la actividad, incluyendo la descripción completa. Las imágenes binarias y sus metadatos no forman parte de este DTO. Borradores, actividades no publicadas y actividades desactivadas reciben la misma respuesta `404` que un ID inexistente.

### Errores

- `400`: ID o filtros inválidos, parámetros repetidos o compuestos; respuesta `{ "ok": false, "message": "..." }`.
- `404`: detalle no encontrado o no público; respuesta `{ "ok": false, "message": "Evento o capacitación no encontrado." }`.
- `500`: los errores inesperados pasan al middleware global existente y devuelven `{ "ok": false, "message": "Error interno del servidor" }`, sin detalles SQL ni trazas en la respuesta.

### Alcance de los cupos

La entidad actual tiene `cupoMaximo` y no registra inscripciones ni reservas. `cuposDisponibles` refleja ese cupo configurado; no descuenta participantes. `null` significa cupo no especificado, `0` significa sin cupos y un valor positivo conserva la capacidad registrada. Calcular disponibilidad restante a partir de inscripciones corresponde a una funcionalidad posterior.

## Pruebas automáticas

Desde `backend`, con las dependencias instaladas y MySQL accesible mediante las variables existentes `DB_HOST`, `DB_PORT`, `DB_USERNAME` y `DB_PASSWORD`:

```powershell
npm.cmd run typecheck
npm.cmd run test:visualizacion-eventos-capacitaciones
```

La suite utiliza `node:test`, HTTP real contra Express y consultas TypeORM reales sobre MySQL. El usuario MySQL necesita permisos para crear y eliminar la base temporal de la prueba.

Validación ejecutada el 9 de septiembre de 2026: `npm.cmd run typecheck` terminó correctamente y `npm.cmd run test:visualizacion-eventos-capacitaciones` aprobó los 12 casos, sin omisiones. La ejecución completa, incluidas migraciones y cierre de la base aislada, terminó con código `0`.

Cada ejecución genera un nombre `eventos_view_<timestamp>_<pid>_<aleatorio>_test`. Crea esa base sin `IF NOT EXISTS`, sustituye `DB_DATABASE` en memoria antes de importar `AppDataSource` y ejecuta las migraciones ya existentes con `synchronize: false`. Antes de las escrituras comprueba tanto `dataSource.options.database` como `SELECT DATABASE()`. Al terminar elimina exclusivamente la base creada por ese proceso tras volver a comprobar su identidad. No usa, limpia ni modifica la base configurada originalmente, y no modifica `.env`.

Si el proceso se interrumpe abruptamente antes del cierre, puede quedar su base temporal; una ejecución posterior genera otro nombre y no la reutiliza. No se incluye ninguna limpieza genérica de otras bases.

Los doce casos cubren:

- Catálogo vacío, acceso sin token y visibilidad limitada a publicados.
- Nombre, temporada y tipo combinados; conteos de pestañas.
- Búsqueda sin distinguir mayúsculas y tratamiento literal de comodines, comillas y barras.
- Paginación de 22 registros, desempates por ID y páginas fuera de rango.
- Rechazo de filtros inválidos, repetidos y compuestos.
- Compatibilidad del arreglo devuelto por el endpoint existente.
- Detalle completo sin imágenes binarias.
- Cupos `null`, cero y positivos en catálogo y detalle.
- `404` para inexistentes y todos los estados ocultos; `400` para IDs inválidos.
- Fallos inesperados en listado y detalle encaminados al middleware global, con respuesta `500` sin información interna.

## Revisión manual de interfaz

Ejecutar frontend y backend con su configuración habitual. Para verificar datos visibles, usar actividades publicadas ya disponibles o crear fixtures en una base de desarrollo dedicada mediante el formulario administrativo existente.

- Comprobar el catálogo desde una sesión visitante y una sesión administradora.
- Revisar móvil (360 px), tablet (768 px) y escritorio (1280 px): tarjetas, búsqueda, selector, pestañas y paginación sin desbordamiento horizontal.
- Confirmar nombre, fecha local, hora, lugar, temporada, tipo y cupos de cada tarjeta.
- Buscar un nombre con mayúsculas y aplicar ambas temporadas; comprobar resultados vacíos y los conteos de las pestañas.
- Cambiar de página, modificar búsqueda o temporada y confirmar que el catálogo vuelve a la primera página.
- Abrir una actividad y revisar descripción completa y datos; cerrar el detalle con el control de cierre y el teclado.
- Revisar textos de cupos no especificados, sin cupos y cupos positivos sin presentar un número inventado.
- Detener temporalmente el backend y comprobar el estado de error y la recuperación al reintentar.

Esta lista documenta la revisión visual; no sustituye una ejecución de navegador ni afirma que se haya realizado.

### Verificación de frontend realizada el 2026-09-09

La compilación de producción y el lint de los tres archivos frontend de este PBI pasaron. El lint global mantiene siete errores previos de reglas de hooks en `login.tsx`, archivo que no se modificó.

Se ejecutó además una comprobación con Playwright y Edge sin interfaz visible, utilizando respuestas API simuladas: catálogo público, paginación, búsqueda y temporada combinadas, resultados vacíos, recuperación de errores de catálogo y detalle, cierre con Escape, retorno del foco y vista administrativa con sus acciones existentes. El catálogo y el modal se comprobaron a 320, 375, 768 y 1440 px sin desbordamiento horizontal. Esta comprobación de navegador complementa las pruebas HTTP con MySQL real; no utilizó la base de datos de la aplicación.

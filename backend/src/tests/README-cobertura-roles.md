# Informe de cobertura y pruebas de seguridad — Gestión de Roles

## Datos de la ejecución

- Fecha: 2026-08-14 04:52:12 (UTC-06:00, America/Costa_Rica).
- Sistema operativo: Microsoft Windows NT 10.0.26200.0.
- Node.js: v24.19.0.
- npm: 11.17.0.
- TypeScript: 6.0.3.
- MySQL: 8.0.46.
- Runner: Node Test Runner mediante `tsx`.
- Base de datos: MySQL de pruebas aislada, calculada por la suite como `${DB_DATABASE}_test`. La base principal no se utiliza para preparar los escenarios.

## Comandos ejecutados

Suite funcional:

```powershell
npm test
```

Cobertura nativa de Node:

```powershell
node --experimental-test-coverage --import tsx --test src/tests/roles.test.ts
```

## Resultado general

| Métrica | Resultado |
|---|---:|
| Suites | 5 |
| Pruebas ejecutadas | 43 |
| Exitosas | 43 |
| Fallidas | 0 |
| Canceladas | 0 |
| Omitidas | 0 |

Las cinco suites corresponden a servicio, controlador, rutas HTTP, auditoría y concurrencia.

Durante dos casos negativos aparecen trazas de conexión MySQL en la salida. Son provocadas deliberadamente por las pruebas que desconectan la base para verificar el manejo controlado de errores `500`; no representan fallos del resultado.

## Cobertura

| Tipo | Cobertura |
|---|---:|
| Líneas | 93.22% |
| Ramas | 91.30% |
| Funciones | 97.84% |

### Cobertura de los componentes principales

| Archivo | Líneas | Ramas | Funciones |
|---|---:|---:|---:|
| `src/middleware/auth.middleware.ts` | 97.44% | 90.48% | 100.00% |
| `src/middleware/authorization.middleware.ts` | 100.00% | 94.74% | 100.00% |
| `roles.controller.ts` | 98.57% | 96.00% | 100.00% |
| `roles.route.ts` | 100.00% | 100.00% | 100.00% |
| `roles.service.ts` | 97.89% | 91.18% | 100.00% |
| `1786838400000-RegisterInitialRoles.ts` | 100.00% | 91.67% | 100.00% |

### Alcance exacto

Los porcentajes globales corresponden exclusivamente a los archivos cargados por `src/tests/roles.test.ts`:

- `src/data-source.ts`.
- Middleware de autenticación JWT.
- Middleware de autorización/RBAC.
- Migraciones ejecutadas al preparar la base de pruebas.
- Entidades `Usuario`, `Rol`, `LoginAttempt` e `HistorialCambioRol`.
- Ruta, controlador y servicio de Gestión de Roles.

La métrica no representa la cobertura de todo el repositorio. No incluye el frontend ni módulos no importados por esta suite, como el flujo completo de Login, Registro o el arranque de `index.ts`.

## Casos de seguridad cubiertos

| Caso | Resultado comprobado | Estado |
|---|---|---|
| GET y PUT sin token | `401 Unauthorized` | Cubierto |
| Token inválido | `401 Unauthorized` | Cubierto |
| Token expirado | `401 Unauthorized` | Cubierto |
| Usuario visitante | `403 Forbidden` | Cubierto |
| Usuario asociado | `403 Forbidden` | Cubierto |
| Usuario administrador | `200 OK` | Cubierto |
| JWT con claim de rol obsoleto | RBAC consulta el rol vigente en MySQL | Cubierto |
| Administrador degradado | Pierde acceso usando el mismo JWT | Cubierto |
| Visitante promovido | Obtiene acceso usando el mismo JWT | Cubierto |
| Usuario eliminado | JWT válido recibe `401` | Cubierto |
| Error de BD durante RBAC | Respuesta controlada `500`, no `403` | Cubierto |
| Auto-democión | Operación rechazada con `400` | Cubierto |
| Último administrador | No se permite dejar el sistema sin administradores | Cubierto |
| Auditoría exitosa | Registra actor, afectado, rol anterior y nuevo | Cubierto |
| Operación rechazada | No genera auditoría de cambio exitoso | Cubierto |
| Fallo de auditoría | Revierte el cambio de rol | Cubierto |
| Concurrencia | Dos degradaciones simultáneas no dejan cero administradores | Cubierto |

También se comprueban ID inválido, usuario inexistente, rol inexistente, respuestas de controlador y consulta de usuarios con sus roles.

## Riesgos y casos no cubiertos

- No hay pruebas automatizadas del control visual por rol en React.
- No hay cobertura de búsqueda y filtros del panel frontend.
- No se mide cobertura integral de Login, Registro, `index.ts` ni del frontend.
- No hay pruebas específicas de XSS en contenido mostrado por el frontend.
- No hay pruebas explícitas de payloads extremadamente grandes o límites de frecuencia sobre los endpoints de roles.
- No hay una prueba específica de inyección SQL; el módulo utiliza TypeORM y parámetros, pero este vector no se valida mediante un caso dedicado.
- No se prueba compromiso o filtración de `JWT_SECRET` ni rotación de claves.
- No se realiza una prueba de penetración externa ni un análisis dinámico de seguridad.
- El JWT continúa siendo criptográficamente válido después de un cambio de rol; la autorización inmediata se garantiza consultando el rol vigente en MySQL.
- La disponibilidad del servicio depende de MySQL: un fallo de base de datos impide autorizar y produce un error controlado `500`.

## Conclusión

La Gestión de Roles presenta una cobertura alta dentro del alcance backend evaluado y las 43 pruebas pasan. Los controles críticos de autenticación, autorización, vigencia del rol, protección del último administrador, auditoría, rollback y concurrencia están comprobados.

Para el alcance específico del backend de Gestión de Roles, el resultado es satisfactorio y permite cerrar la tarea de elaboración del informe. Esto no equivale a certificar la seguridad completa de la aplicación: los riesgos no cubiertos y el frontend requieren tareas independientes si pasan a formar parte del alcance futuro.

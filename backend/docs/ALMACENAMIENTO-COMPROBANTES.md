# Comprobantes privados en MySQL

La arquitectura final guarda el binario en `comprobantes_pago.contenido` (`LONGBLOB`) junto con reserva, usuario, MIME, tamaño, SHA-256 y fecha. No se usan S3 ni proveedores externos para comprobantes nuevos. La descarga se realiza únicamente por el endpoint autenticado para titular o administrador; `/uploads/comprobantes` sigue bloqueado.

Desarrollo usa `PRIVATE_STORAGE_PROVIDER=local` y almacena objetos fuera de `uploads`, en `PRIVATE_STORAGE_PATH` (por defecto `private-storage`). Producción requiere `PRIVATE_STORAGE_PROVIDER=s3`, `S3_BUCKET`, `S3_REGION` y, para proveedores S3 compatibles, `S3_ENDPOINT` y opcionalmente `S3_FORCE_PATH_STYLE=true`. Las credenciales se suministran mediante el mecanismo de identidad del despliegue; nunca se incluyen en Git.

El bucket debe ser privado, sin política pública, con cifrado en reposo y permisos mínimos: `GetObject`, `PutObject` y `DeleteObject` únicamente bajo el prefijo `payment-proofs/`. Las descargas pasan por el backend autorizado, no por URL pública.

## Despliegue y migración

1. Aplicar las migraciones en una base de mantenimiento aprobada, nunca directamente desde desarrollo.
2. Configurar el proveedor y probar una carga/descarga ficticia con rol titular y administrador.
3. Ejecutar primero `npm run storage:migrate-comprobantes` (simulación por defecto). No escribe ni borra objetos.
4. Revisar incidencias, hashes y conteos. Para ejecutar: `MIGRAR_COMPROBANTES_CONFIRMO=si npm run storage:migrate-comprobantes -- --apply`.
5. El comando es idempotente: omite reservas que ya tengan metadato. Nunca borra archivos locales.
6. Mantener lectura de contingencia y respaldos hasta reconciliar todos los objetos antes de retirar el almacenamiento histórico.

import jwt from 'jsonwebtoken';

const PROPOSITO_CAPACIDAD_EVIDENCIA = 'adjuntar-evidencias';
const TIPO_CAPACIDAD_EVIDENCIA = 'incidencia-evidencia-capability';
const VIGENCIA_CAPACIDAD_EVIDENCIA = '15m';

interface CapacidadEvidenciaPayload {
  tipo?: unknown;
  proposito?: unknown;
  incidenciaId?: unknown;
}

export function crearCapacidadEvidenciaAnonima(incidenciaId: number): string {
  return jwt.sign(
    {
      tipo: TIPO_CAPACIDAD_EVIDENCIA,
      proposito: PROPOSITO_CAPACIDAD_EVIDENCIA,
      incidenciaId,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: VIGENCIA_CAPACIDAD_EVIDENCIA },
  );
}

export function validarCapacidadEvidenciaAnonima(
  token: string,
  incidenciaId: number,
): boolean {
  const payload = jwt.verify(
    token,
    process.env.JWT_SECRET as string,
  ) as CapacidadEvidenciaPayload;

  return (
    payload.tipo === TIPO_CAPACIDAD_EVIDENCIA &&
    payload.proposito === PROPOSITO_CAPACIDAD_EVIDENCIA &&
    payload.incidenciaId === incidenciaId
  );
}

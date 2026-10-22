import { LessThanOrEqual } from 'typeorm';
import { AppDataSource } from '../../../data-source';
import { RecuperacionContrasena } from '../../../models/RecuperacionContrasena';

const INTERVALO_LIMPIEZA_MS = 6 * 60 * 60 * 1000;

export async function eliminarTokensExpirados(): Promise<number> {
  const resultado = await AppDataSource.getRepository(RecuperacionContrasena).delete({
    expiresAt: LessThanOrEqual(new Date()),
  });

  return resultado.affected ?? 0;
}

export function iniciarLimpiezaTokensExpirados(): void {
  const ejecutarLimpieza = () => {
    void eliminarTokensExpirados().catch(() => {
      console.error('No se pudo completar la limpieza de tokens de recuperación expirados.');
    });
  };

  ejecutarLimpieza();

  const intervalo = setInterval(ejecutarLimpieza, INTERVALO_LIMPIEZA_MS);
  intervalo.unref();
}

import { AppDataSource } from '../../../data-source';
import { TokenBlacklist } from '../../../models/TokenBlacklist';
import jwt from 'jsonwebtoken';


const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hora

export async function eliminarTokensExpirados(): Promise<number> {
  try {
    const repo = AppDataSource.getRepository(TokenBlacklist);

    const tokensBloqueados = await repo.find();

    let tokenBorrados = 0;

    for (const tokenInBlacklist of tokensBloqueados) {
      try {
        const decoded = jwt.decode(tokenInBlacklist.token);

        if (typeof decoded === 'object' && decoded !== null && 'exp' in decoded) {
          const expiresAt = new Date((decoded.exp as number) * 1000);

          if (expiresAt < new Date()) {
            await repo.remove(tokenInBlacklist);
            tokenBorrados++;
          }
        }
      } catch (error) {
        await repo.remove(tokenInBlacklist);
        tokenBorrados++;
      }
    }

    console.log(`Limpieza de tokens completada: ${tokenBorrados} tokens eliminados`);
    return tokenBorrados;
  } catch (error) {
    console.error('Error durante la limpieza de tokens blacklist:', error);
    return 0;
  }
}

export function iniciarLimpiezaTokensBlacklist(): void {
  setInterval(() => {
    void eliminarTokensExpirados().catch(() => {
      console.error('No se pudo completar la limpieza de tokens blacklist.');
    });
  }, CLEANUP_INTERVAL_MS);

  console.log(
    `Limpieza de tokens blacklist iniciada (cada ${CLEANUP_INTERVAL_MS / 1000 / 60} minutos)`,
  );
}

import { AppDataSource } from '../../data-source';
import { Resena } from '../../models/Resena';

export interface CrearResenaInput {
  puntuacion: number;
  comentario: string;
  nombreVisitante?: string;
  usuarioId?: number;
}

export class ResenaService {
  async crear(input: CrearResenaInput): Promise<Resena> {
    const resena = AppDataSource.getRepository(Resena).create({
      puntuacion: input.puntuacion,
      comentario: input.comentario,
      ...(input.usuarioId !== undefined
        ? { usuarioId: input.usuarioId }
        : { nombreVisitante: input.nombreVisitante! }),
    });

    return AppDataSource.getRepository(Resena).save(resena);
  }

  async listar(): Promise<Resena[]> {
    return AppDataSource.getRepository(Resena).find({
      order: { fecha: 'DESC' },
    });
  }
}

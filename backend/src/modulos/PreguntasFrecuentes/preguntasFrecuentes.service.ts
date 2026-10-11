import type { Repository } from 'typeorm';
import { AppDataSource } from '../../data-source';
import { PreguntasFrecuentes } from '../../models/PreguntasFrecuentes';

export interface CrearPreguntaFrecuente {
  pregunta: string;
  respuesta: string;
  palabrasClave?: string[];
  publicada?: boolean;
}

export type ActualizarPreguntaFrecuente = Partial<CrearPreguntaFrecuente>;

export class PreguntasFrecuentesService {
  private readonly repo: Repository<PreguntasFrecuentes>;

  constructor(repo?: Repository<PreguntasFrecuentes>) {
    this.repo = repo ?? AppDataSource.getRepository(PreguntasFrecuentes);
  }

  listarPublicadas() {
    return this.repo.find({
      where: { publicada: true },
      order: { id: 'ASC' },
    });
  }

  listarTodas() {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  crear(input: CrearPreguntaFrecuente) {
    return this.repo.save(this.repo.create({
      pregunta: input.pregunta.trim(),
      respuesta: input.respuesta.trim(),
      palabrasClave: input.palabrasClave ?? [],
      publicada: input.publicada ?? false,
    }));
  }

  async editar(id: number, input: ActualizarPreguntaFrecuente) {
    const pregunta = await this.repo.findOneBy({ id });
    if (!pregunta) return null;

    if (input.pregunta !== undefined) pregunta.pregunta = input.pregunta.trim();
    if (input.respuesta !== undefined) pregunta.respuesta = input.respuesta.trim();
    if (input.palabrasClave !== undefined) pregunta.palabrasClave = input.palabrasClave;
    // Si no se envía el estado, una FAQ publicada conserva su publicación.
    if (input.publicada !== undefined) pregunta.publicada = input.publicada;

    return this.repo.save(pregunta);
  }

  async cambiarPublicacion(id: number, publicada: boolean) {
    const pregunta = await this.repo.findOneBy({ id });
    if (!pregunta) return null;
    pregunta.publicada = publicada;
    return this.repo.save(pregunta);
  }

  async eliminar(id: number): Promise<boolean> {
    const resultado = await this.repo.delete(id);
    return Boolean(resultado.affected);
  }
}

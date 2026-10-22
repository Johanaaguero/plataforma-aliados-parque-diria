import { GoogleGenAI, Type, type GoogleGenAIOptions } from '@google/genai';

export const FAQ_IDS = [
  'ubicacion',
  'servicios',
  'emprendimientos',
  'eventos',
  'reservas',
  'incidencias',
  'contacto',
  'informacion_parque',
  'asociacion',
  'objetivo_asociacion',
  'como_llegar',
] as const;
export type FaqId = (typeof FAQ_IDS)[number];

export interface FaqClassifier {
  classify(message: string): Promise<FaqId | null>;
}

export class GeminiFaqClassificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiFaqClassificationError';
  }
}

export interface SafeGeminiErrorMetadata {
  errorType: string;
  httpStatus?: number;
  errorCode?: number | string;
}

export const getSafeGeminiErrorMetadata = (
  error: unknown,
): SafeGeminiErrorMetadata => {
  const details =
    typeof error === 'object' && error !== null
      ? (error as Record<string, unknown>)
      : {};
  const apiKey = process.env.GEMINI_API_KEY;
  const errorType =
    typeof details.name === 'string' &&
    /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(details.name) &&
    (!apiKey || !details.name.includes(apiKey))
      ? details.name
      : 'UnknownError';
  const httpStatus =
    typeof details.status === 'number' &&
    Number.isInteger(details.status) &&
    details.status >= 100 &&
    details.status <= 599
      ? details.status
      : undefined;
  const errorCode =
    typeof details.code === 'number' && Number.isInteger(details.code)
      ? details.code
      : typeof details.code === 'string' &&
          /^[A-Z][A-Z0-9_]{0,31}$/.test(details.code) &&
          (!apiKey || !details.code.includes(apiKey))
        ? details.code
        : undefined;

  return {
    errorType,
    ...(httpStatus === undefined ? {} : { httpStatus }),
    ...(errorCode === undefined ? {} : { errorCode }),
  };
};

/** Transient provider failures and invalid classifications activate local fallback. */
export const shouldUseLocalFaqFallback = (error: unknown): boolean => {
  const metadata = getSafeGeminiErrorMetadata(error);
  if (metadata.httpStatus === 429 || metadata.httpStatus === 503) return true;

  const details = typeof error === 'object' && error !== null
    ? error as Record<string, unknown>
    : {};
  const name = typeof details.name === 'string' ? details.name.toLowerCase() : '';
  const code = typeof details.code === 'string' ? details.code.toUpperCase() : '';
  return (
    name === 'geminifaqclassificationerror' ||
    name.includes('timeout') ||
    name === 'aborterror' ||
    code.includes('TIMEOUT') ||
    code === 'ETIMEDOUT' ||
    code === 'ABORT_ERR' ||
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    code === 'ECONNABORTED' ||
    name === 'typeerror' && /fetch|network|connect/i.test(
      typeof details.message === 'string' ? details.message : '',
    )
  );
};

const debeReintentarErrorGemini = (error: unknown): boolean => {
  const metadata = getSafeGeminiErrorMetadata(error);
  if (metadata.httpStatus === 429 || metadata.httpStatus === 503) return true;
  const details = typeof error === 'object' && error !== null
    ? error as Record<string, unknown>
    : {};
  const code = typeof details.code === 'string' ? details.code.toUpperCase() : '';
  const name = typeof details.name === 'string' ? details.name.toLowerCase() : '';
  return (
    shouldUseLocalFaqFallback(error) &&
    (name.includes('timeout') ||
      name === 'aborterror' ||
      name === 'typeerror' ||
      code.startsWith('ECONN') ||
      code === 'ENOTFOUND' ||
      code === 'EAI_AGAIN' ||
      code === 'ABORT_ERR')
  );
};

const normalizarConsulta = (texto: string) => texto
  .trim()
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const REGLAS_FAQ: Array<{ id: FaqId; patrones: RegExp[] }> = [
  { id: 'objetivo_asociacion', patrones: [/\b(objetivo|proposito|meta|mision|labor|funcion)\b/, /\b(para que|que busca|que pretende)\b/] },
  { id: 'como_llegar', patrones: [/\b(como llego|como llegar|llegar|ruta|camino|carretera|indicaciones|direccion|por donde se va|mapa)\b/] },
  { id: 'ubicacion', patrones: [/\b(donde (queda|esta|se encuentra|se ubica)|ubicacion|ubicado|ubicada|provincia|canton|arado|guanacaste)\b/] },
  { id: 'reservas', patrones: [/\b(reserv|apartar|cupo|disponibilidad)\w*\b/] },
  { id: 'incidencias', patrones: [/\b(incidencia|reportar|reporte|denunciar|dano|basura|tala)\w*\b/, /\b(problema|situacion)\w*\b.*\b(parque|ambiental|sendero|basura|arbol)\b/] },
  { id: 'contacto', patrones: [/\b(contact|telefono|numero|llamar|comunicar|whatsapp|correo|email)\w*\b/, /\b(como los localizo|como me comunico)\b/] },
  { id: 'emprendimientos', patrones: [/\b(emprendimiento|negocio|producto|artesania|vendedor|emprendedor)\w*\b/] },
  { id: 'eventos', patrones: [/\b(evento|actividad|capacitacion|taller|charla)\w*\b/] },
  { id: 'servicios', patrones: [/\b(servicio|plataforma)\w*\b/, /\b(opciones?|funciones?)\b.*\b(ofrece|sistema|plataforma|servicios?)\b/, /\b(ofrece|ofrecen)\b.*\b(plataforma|sistema|servicios?)\b/] },
  { id: 'asociacion', patrones: [/\b(asociacion|aliados)\b/, /\b(quienes son|que es la asociacion)\b/] },
  { id: 'informacion_parque', patrones: [/\b(flora|fauna|sendero|naturaleza|animales|plantas|silvestre|conservacion)\w*\b/, /\b(parque nacional|informacion del parque|sobre el parque)\b/] },
];

/** Classifies only recognized intents; callers must use the approved FAQ answer catalog. */
export class LocalFaqClassifier {
  async classify(message: string): Promise<FaqId | null> {
    const consulta = normalizarConsulta(message);
    if (!consulta) return null;
    for (const regla of REGLAS_FAQ) {
      if (regla.patrones.some((patron) => patron.test(consulta))) return regla.id;
    }
    return null;
  }
}

const MODEL_ID = 'gemini-3.8-flash';
// Dos llamadas de hasta 12 s y 250 ms de espera caben en el límite de 25 s.
const REQUEST_TIMEOUT_MS = 12_000;
const RETRY_DELAY_MS = 250;

type GeminiClient = Pick<GoogleGenAI, 'models'>;
type GeminiClientFactory = (options: GoogleGenAIOptions) => GeminiClient;

export class GeminiFaqClassifier implements FaqClassifier {
  constructor(
    private readonly createClient: GeminiClientFactory = (options) =>
      new GoogleGenAI(options),
  ) {}

  async classify(message: string): Promise<FaqId | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new GeminiFaqClassificationError('Gemini API key is unavailable');
    }

    const client = this.createClient({
      apiKey,
      // Desactiva el reintento automático general del SDK; aquí solo repetimos 503.
      httpOptions: {
        timeout: REQUEST_TIMEOUT_MS,
        retryOptions: { attempts: 1 },
      },
    });
    const generarContenido = () => client.models.generateContent({
      model: MODEL_ID,
      contents: [
        'Clasifica la consulta del usuario en una categoría del catálogo. ',
        'Devuelve únicamente el identificador, nunca una respuesta ni explicación. ',
        'Si no hay relación clara con una categoría, devuelve "ninguna". ',
        'Categorías: ubicacion = provincia, cantón, zona o sector donde está el parque; ',
        'como_llegar = rutas, caminos o indicaciones para llegar al parque; ',
        'servicios = servicios disponibles en la plataforma; ',
        'emprendimientos = negocios, productos o emprendimientos de la comunidad; ',
        'eventos = eventos, capacitaciones, actividades o talleres; ',
        'reservas = reservar servicios o actividades; ',
        'incidencias = reportes de problemas o situaciones en el entorno del parque; ',
        'contacto = medios para comunicarse con la Asociación; ',
        'informacion_parque = información general, naturaleza, flora, fauna o senderos; ',
        'asociacion = identidad y descripción de la Asociación; ',
        'objetivo_asociacion = propósito, función o labor de la Asociación. ',
        `Consulta: ${JSON.stringify(message)}`,
      ].join(''),
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            faqId: { type: Type.STRING, enum: [...FAQ_IDS, 'ninguna'] },
          },
          required: ['faqId'],
        },
      },
    });

    let result: Awaited<ReturnType<typeof generarContenido>>;
    try {
      try {
        result = await generarContenido();
      } catch (error) {
        if (!debeReintentarErrorGemini(error)) throw error;
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        result = await generarContenido();
      }
    } catch (error) {
      console.error(
        'Gemini API request failed',
        { diagnostic: 'http_error', ...getSafeGeminiErrorMetadata(error) },
      );
      throw error;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.text ?? '');
    } catch {
      console.info('Gemini classification diagnostic', { outcome: 'format_error' });
      throw new GeminiFaqClassificationError('Gemini returned an invalid classification');
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('faqId' in parsed) ||
      typeof parsed.faqId !== 'string'
    ) {
      console.info('Gemini classification diagnostic', { outcome: 'format_error' });
      throw new GeminiFaqClassificationError('Gemini returned an invalid classification');
    }
    if (parsed.faqId === 'ninguna') {
      console.info('Gemini classification diagnostic', { outcome: 'none' });
      return null;
    }
    if (!FAQ_IDS.includes(parsed.faqId as FaqId)) {
      console.info('Gemini classification diagnostic', { outcome: 'invalid_identifier' });
      throw new GeminiFaqClassificationError('Gemini returned an invalid category');
    }

    const faqId = parsed.faqId as FaqId;
    console.info('Gemini classification diagnostic', {
      outcome: 'category',
      category: faqId,
    });
    return faqId;
  }
}

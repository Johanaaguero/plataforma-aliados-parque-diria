import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
} from 'react';

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB, debe coincidir con el backend
const MAX_IMAGENES_POR_DEFECTO = 6;

interface ImageDropzoneProps {
  value: File[];
  onChange: (archivos: File[]) => void;
  maxArchivos?: number;
  disabled?: boolean;
}

function formatearTamanio(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Selector de imágenes con arrastrar-y-soltar, click-para-explorar y
 * previsualización en grilla. No sube nada por sí solo: solo entrega
 * la lista de File al padre a través de onChange.
 */
export default function ImageDropzone({
  value,
  onChange,
  maxArchivos = MAX_IMAGENES_POR_DEFECTO,
  disabled = false,
}: ImageDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // Genera y limpia las URLs de previsualización cuando cambia la selección
  useEffect(() => {
    const urls = value.map((archivo) => URL.createObjectURL(archivo));
    setPreviews(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [value]);

  const agregarArchivos = useCallback(
    (listaArchivos: FileList | File[]) => {
      const nuevosErrores: string[] = [];
      const validos: File[] = [];

      Array.from(listaArchivos).forEach((archivo) => {
        if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
          nuevosErrores.push(`${archivo.name}: formato no permitido`);
          return;
        }
        if (archivo.size > TAMANO_MAXIMO_BYTES) {
          nuevosErrores.push(`${archivo.name}: supera los 5 MB`);
          return;
        }
        validos.push(archivo);
      });

      const espacioDisponible = Math.max(maxArchivos - value.length, 0);
      const aAgregar = validos.slice(0, espacioDisponible);

      if (validos.length > aAgregar.length) {
        nuevosErrores.push(`Solo puedes agregar hasta ${maxArchivos} imágenes`);
      }

      setErrores(nuevosErrores);
      if (aAgregar.length > 0) {
        onChange([...value, ...aAgregar]);
      }
    },
    [maxArchivos, onChange, value],
  );

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastrando(false);
    if (disabled) return;
    if (e.dataTransfer.files?.length) {
      agregarArchivos(e.dataTransfer.files);
    }
  };

  const quitarArchivo = (indice: number) => {
    onChange(value.filter((_, i) => i !== indice));
  };

  const hayEspacio = value.length < maxArchivos;

  return (
    <div>
      {hayEspacio && (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          aria-label="Agregar imágenes: arrastra archivos aquí o presiona para seleccionar"
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-2 rounded-[1.5rem] border-2 border-dashed px-4 py-8 text-center outline-none focus-visible:ring-4 focus-visible:ring-[#009444]/25 motion-safe:transition-colors motion-safe:duration-200 ${
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          } ${
            arrastrando
              ? 'border-[#009444] bg-[#8DC63F]/15'
              : 'border-[#095540]/25 bg-white/60 hover:border-[#095540]/45 hover:bg-[#095540]/5'
          }`}
        >
          <svg
            className="h-8 w-8 text-[#095540]/50"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 16V4m0 0L7 9m5-5l5 5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>

          <p className="text-sm font-bold text-[#095540]">
            Arrastra tus imágenes aquí o haz clic para seleccionar
          </p>
          <p className="text-xs text-slate-500">
            JPG, PNG, WEBP o GIF · máximo 5 MB · hasta {maxArchivos} imágenes
          </p>

          <input
            ref={inputRef}
            id={inputId}
            type="file"
            multiple
            accept={TIPOS_PERMITIDOS.join(',')}
            disabled={disabled}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) agregarArchivos(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      )}

      {errores.length > 0 && (
        <ul className="mt-3 space-y-1" role="alert">
          {errores.map((error) => (
            <li
              key={error}
              className="flex items-center gap-2 text-xs font-semibold text-[#095540]"
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D823]"
                aria-hidden="true"
              />
              {error}
            </li>
          ))}
        </ul>
      )}

      {value.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {value.map((archivo, indice) => (
            <div
              key={`${archivo.name}-${archivo.lastModified}-${indice}`}
              className="group relative overflow-hidden rounded-2xl border border-[#095540]/12 bg-white"
            >
              <img
                src={previews[indice]}
                alt={archivo.name}
                className="aspect-square w-full object-cover"
              />

              {!disabled && (
                <button
                  type="button"
                  onClick={() => quitarArchivo(indice)}
                  aria-label={`Quitar ${archivo.name}`}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white outline-none hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-white motion-safe:transition-colors motion-safe:duration-150"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )}

              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-2 py-1 text-[0.65rem] font-medium text-white">
                {formatearTamanio(archivo.size)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
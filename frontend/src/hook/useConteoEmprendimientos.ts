import { useEffect, useState } from "react";
import { obtenerEmprendimientosAdministrativos } from "../services/emprendimientoService";

interface ConteoEmprendimientos {
  total: number;
  publicados: number;
  noPublicados: number;
  borradores: number;
}

export function useConteoEmprendimientos() {
  const [conteo, setConteo] = useState<ConteoEmprendimientos>({
    total: 0,
    publicados: 0,
    noPublicados: 0,
    borradores: 0,
  });

  const recargar = () => {
    obtenerEmprendimientosAdministrativos().then((lista) => {
      setConteo({
        total: lista.length,
        publicados: lista.filter((e) => e.estadoPublicacion === "publicado").length,
        noPublicados: lista.filter((e) => e.estadoPublicacion === "no_publicado").length,
        borradores: lista.filter((e) => e.estadoPublicacion === "borrador").length,
      });
    });
  };

  useEffect(() => {
    recargar();
  }, []);

  return { conteo, recargar };
}
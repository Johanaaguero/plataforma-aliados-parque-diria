import { useEffect, useState } from "react";
import { obtenerEventos } from "../services/eventosCapacitacionesService";

interface ConteoEventos {
  todos: number;
  eventos: number;
  capacitaciones: number;
}

export function useConteoEventos() {
  const [conteo, setConteo] = useState<ConteoEventos>({
    todos: 0,
    eventos: 0,
    capacitaciones: 0,
  });

  const recargar = () => {
    obtenerEventos({ pagina: 1 }).then((respuesta) => {
      setConteo(respuesta.conteos);
    });
  };

  useEffect(() => {
    recargar();
  }, []);

  return { conteo, recargar };
}
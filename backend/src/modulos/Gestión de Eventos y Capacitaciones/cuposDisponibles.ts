export const calcularCuposDisponibles = (
  cupoMaximo: number | null,
  inscritos: number,
): number | null => {
  if (cupoMaximo === null) {
    return null;
  }

  return Math.max(cupoMaximo - inscritos, 0);
};

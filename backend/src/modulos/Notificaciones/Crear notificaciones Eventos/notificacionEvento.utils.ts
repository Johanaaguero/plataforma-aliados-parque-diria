interface UsuarioDestinatarioEvento {
  id: number;
  rol?: {
    nombre: string;
  } | null;
}

export const seleccionarDestinatariosEvento = <
  T extends UsuarioDestinatarioEvento,
>(
  usuarios: T[],
  usuariosYaNotificados: ReadonlySet<number>,
): T[] =>
  usuarios.filter(
    (usuario) =>
      ['visitante', 'asociado', 'administrador'].includes(
        usuario.rol?.nombre ?? '',
      ) && !usuariosYaNotificados.has(usuario.id),
  );

import accesoParque from '../../assets/diria-paisaje-1.jpg';
import rioDiria from '../../assets/diria-paisaje-2.jpg';
import bosqueDiria from '../../assets/diria-paisaje-3.jpg';
import cafeLocal from '../../assets/diria-paisaje-4.jpg';

export const CONTENIDO_PARQUE = {
  etiqueta: 'Conoce nuestro parque',
  titulo: 'Un refugio natural conectado con su comunidad.',
  descripcion:
    'El Parque Nacional Diriá es un espacio natural que destaca por su riqueza ecológica, sus paisajes y la diversidad de especies que habitan en la zona.',
  comunidad:
    'A través de SIGTAD podrás conocer sus atractivos, actividades, eventos y los emprendimientos de los aliados de nuestra comunidad.',
  mensaje: 'Naturaleza, turismo rural y colaboración en un mismo territorio.',
} as const;

export const FOTOS_PARQUE = [
  {
    src: rioDiria,
    alt: 'Poza natural entre las rocas del Parque Nacional Diriá',
  },
  {
    src: accesoParque,
    alt: 'Entrada al Parque Nacional Diriá rodeada de vegetación',
  },
  {
    src: bosqueDiria,
    alt: 'Vista aérea del bosque y las comunidades alrededor del Diriá',
  },
  {
    src: cafeLocal,
    alt: 'Café maduro cultivado por comunidades cercanas al Diriá',
  },
] as const;

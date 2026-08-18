import { useEffect, useState } from 'react';

import parque1 from '../../assets/imagen1.png';
import parque2 from '../../assets/imagen2.png';
import parque3 from '../../assets/imagen3.png';
import parque4 from '../../assets/imagen4.png';

function Informativo() {
  const imagenes = [parque1, parque2, parque3, parque4];

  const [imagenActual, setImagenActual] = useState(0);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setImagenActual((actual) => (actual + 1) % imagenes.length);
    }, 4000);

    return () => clearInterval(intervalo);
  }, []);

  return (
    <section
      id="sobre-parque"
      className="py-20 px-6 bg-white"
    >
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

        {/* CARRUSEL */}
        <div className="relative overflow-hidden rounded-2xl shadow-lg">

          {/* Contenedor de imágenes */}
          <div
            className="flex transition-transform duration-700 ease-in-out"
            style={{
              transform: `translateX(-${imagenActual * 100}%)`,
            }}
          >
            {imagenes.map((imagen, index) => (
              <img
                key={index}
                src={imagen}
                alt={`Parque Nacional Diriá ${index + 1}`}
                className="w-full h-[400px] object-cover flex-shrink-0"
              />
            ))}
          </div>

          {/* Indicadores */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
            {imagenes.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setImagenActual(index)}
                className={`w-3 h-3 rounded-full transition ${
                  imagenActual === index
                    ? 'bg-white'
                    : 'bg-white/50'
                }`}
                aria-label={`Ver imagen ${index + 1}`}
              />
            ))}
          </div>

        </div>

        {/* INFORMACIÓN */}
        <div>
          <p className="text-yellow-700 font-semibold mb-2">
            CONOCE NUESTRO PARQUE
          </p>

          <h2 className="text-4xl font-bold text-gray-800 mb-6">
            Sobre el Parque Nacional Diriá
          </h2>

          <p className="text-gray-600 leading-relaxed mb-4">
            El Parque Nacional Diriá es un espacio natural
            que destaca por su riqueza ecológica, sus paisajes
            y la diversidad de especies que habitan en la zona.
          </p>

          <p className="text-gray-600 leading-relaxed">
            A través de SIGTAD podrás conocer sus atractivos,
            actividades, eventos y los emprendimientos de los
            aliados de nuestra comunidad.
          </p>
        </div>

      </div>
    </section>
  );
}

export default Informativo;
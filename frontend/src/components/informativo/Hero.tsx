import heroImage from '../../assets/parque.png';

function Hero() {
  return (
    <section
      id="inicio"
      className="relative min-h-[600px] bg-cover bg-center"
      style={{
        backgroundImage: `url(${heroImage})`,
      }}
    >
      {/* Capa oscura */}
      <div className="absolute inset-0 bg-black/50"></div>

      {/* Contenido */}
      <div className="relative z-10 min-h-[600px] flex items-center justify-center text-center text-white px-6">
        <div className="max-w-3xl">

          <h1 className="text-5xl font-bold mb-6">
            Bienvenidos al Parque Nacional Diriá
          </h1>

          <p className="text-xl mb-8">
            Descubre la naturaleza, los atractivos turísticos, eventos, actividades y servicios que ofrece el Parque Nacional Diriá, así como la información de contacto de los aliados
            y los emprendimientos de nuestra comunidad.
          </p>

          <div className="flex justify-center gap-4">
            <a
              href="#atractivos"
              className="bg-green-700 px-6 py-3 rounded-lg font-semibold hover:bg-green-800 transition-colors"
            >
              Explorar Parque
            </a>

            <a
              href="#eventos"
              className="border border-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-green-800 transition-colors"
            >
              Ver eventos
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}

export default Hero;
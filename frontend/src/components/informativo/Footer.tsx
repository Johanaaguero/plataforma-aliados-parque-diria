function Footer() {
  return (
    <footer className="bg-green-900 text-white mt-16">
      
      <div className="max-w-7xl mx-auto px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Información */}
        <div>
          <h2 className="text-2xl font-bold mb-4">
            SIGTAD
          </h2>

          <p className="text-green-100 leading-relaxed">
            Sistema de Gestión Turística y Administrativa
            del Parque Nacional Diriá.
          </p>
        </div>

        {/* Enlaces */}
        <div>
          <h3 className="text-lg font-semibold mb-4">
            Enlaces
          </h3>

          <div className="flex flex-col gap-2">
            <a
              href="#inicio"
              className="text-green-100 hover:text-white transition-colors"
            >
              Inicio
            </a>

            <a
              href="#sobre-parque"
              className="text-green-100 hover:text-white transition-colors"
            >
              Sobre el Parque
            </a>

            <a
              href="#atractivos"
              className="text-green-100 hover:text-white transition-colors"
            >
              Atractivos
            </a>

            <a
              href="#emprendimientos"
              className="text-green-100 hover:text-white transition-colors"
            >
              Emprendimientos
            </a>

            <a
              href="#eventos"
              className="text-green-100 hover:text-white transition-colors"
            >
              Eventos
            </a>
          </div>
        </div>

        {/* Contacto */}
        <div>
          <h3 className="text-lg font-semibold mb-4">
            Contacto
          </h3>

          <p className="text-green-100 mb-2">
            Parque Nacional Diriá
          </p>

          <p className="text-green-100 mb-2">
            Guanacaste, Costa Rica
          </p>

          <p className="text-green-100">
            Aliados del Parque
          </p>
        </div>

      </div>

      {/* Copyright */}
      <div className="border-t border-green-700">
        <div className="max-w-7xl mx-auto px-8 py-4 text-center text-sm text-green-200">
          © 2026 Sitema SIGTAD. Todos los derechos reservados.
        </div>
      </div>

    </footer>
  );
}

export default Footer;
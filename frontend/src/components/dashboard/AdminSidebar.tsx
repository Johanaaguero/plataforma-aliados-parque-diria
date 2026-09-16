interface Props {
  collapsed: boolean;
  onToggle: () => void;
  onIrRoles: () => void;
  onIrEmprendimientos: () => void;
  onIrEventos: () => void;
  onIrInscripciones: () => void;
}

function IconoResumen() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 3v18h18M7 15l4-4 3 3 5-6" />
    </svg>
  );
}

function IconoRoles() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function IconoEmprendimientos() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 21h18M4 21V9l8-6 8 6v12M9 21v-6h6v6" />
    </svg>
  );
}

function IconoEventos() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
    </svg>
  );
}

function IconoInscripciones() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 12h6M9 16h6" />
    </svg>
  );
}

function IconoMenu() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export default function AdminSidebar({
  collapsed,
  onToggle,
  onIrRoles,
  onIrEmprendimientos,
  onIrEventos,
  onIrInscripciones,
}: Props) {
  const items = [
    { label: "Resumen", Icono: IconoResumen, onClick: undefined },
    { label: "Roles", Icono: IconoRoles, onClick: onIrRoles },
    { label: "Emprendimientos", Icono: IconoEmprendimientos, onClick: onIrEmprendimientos },
    { label: "Eventos y capacitaciones", Icono: IconoEventos, onClick: onIrEventos },
    { label: "Inscripciones", Icono: IconoInscripciones, onClick: onIrInscripciones },
  ];

  return (
<aside
  className={`h-screen sticky top-0 bg-[#095540] text-slate-200 flex flex-col transition-all duration-200 ${
    collapsed ? "w-16" : "w-60"
  }`}
>
      <button onClick={onToggle} className="p-3 flex justify-center hover:bg-[#087050] transition-colors">
        <IconoMenu />
      </button>

      <nav className="flex-1 flex flex-col gap-1 px-2 mt-2">
        {items.map(({ label, Icono, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            disabled={!onClick}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-[#087050] cursor-pointer text-left disabled:cursor-default"
          >
            <Icono />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}
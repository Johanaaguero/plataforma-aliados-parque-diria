import { useState, type ReactNode } from "react";
import AdminSidebar from "./AdminSidebar";

interface Props {
  children: ReactNode;
  onIrRoles: () => void;
  onIrEmprendimientos: () => void;
  onIrEventos: () => void;
  onIrInscripciones: () => void;
  onIrIncidencias: () => void;
}

export default function AdminLayout({
  children,
  onIrRoles,
  onIrEmprendimientos,
  onIrEventos,
  onIrInscripciones,
  onIrIncidencias,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        onIrRoles={onIrRoles}
        onIrEmprendimientos={onIrEmprendimientos}
        onIrEventos={onIrEventos}
        onIrInscripciones={onIrInscripciones}
        onIrIncidencias={onIrIncidencias}
      />
      <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
    </div>
  );
}

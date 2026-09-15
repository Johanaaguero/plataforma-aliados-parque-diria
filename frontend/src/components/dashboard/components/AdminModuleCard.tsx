import type { ReactNode } from 'react';

interface AdminModuleCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  action: () => void;
}

export default function AdminModuleCard({
  title,
  description,
  icon,
  action,
}: AdminModuleCardProps) {
  return (
    <div className="group flex min-h-56 w-full flex-col rounded-[1.75rem] border border-[#095540]/12 bg-white p-6 text-left shadow-[0_14px_35px_rgba(7,63,49,0.08)] motion-safe:transition motion-safe:duration-200 hover:-translate-y-1 hover:border-[#8dc63f]/80 hover:shadow-[0_20px_44px_rgba(7,63,49,0.16)] motion-reduce:transform-none sm:p-7">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8dc63f]/18 text-[#095540] motion-safe:transition motion-safe:duration-200 group-hover:bg-[#095540] group-hover:text-white">
        {icon}
      </span>

      <span className="mt-6 text-xl font-bold tracking-tight text-[#095540]">
        {title}
      </span>

      <span className="mt-2 text-sm leading-6 text-slate-600">
        {description}
      </span>

      <button
        type="button"
        onClick={action}
        aria-label={`Ir a ${title}`}
        className="mt-auto inline-flex h-9 w-32 self-center cursor-pointer items-center justify-center rounded-lg border-0 bg-[#095540] px-4 text-sm font-semibold text-white outline-none motion-safe:transition-colors motion-safe:duration-200 hover:bg-[#009444] active:bg-[#8dc63f] active:text-[#095540] focus-visible:ring-2 focus-visible:ring-[#8dc63f]/70 focus-visible:ring-offset-2"
      >
        Ver detalles
      </button>
    </div>
  );
}

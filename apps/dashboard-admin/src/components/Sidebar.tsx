const NAV_ITEMS = ["Agenda", "Desempeño", "Especialistas", "Servicios", "Clientes", "Configuración"];

export function Sidebar({ onLogout }: { onLogout?: () => void }) {
  return (
    <nav className="flex w-56 shrink-0 flex-col bg-navy text-white">
      <div className="px-5 py-6">
        <p className="text-lg font-semibold">Aurora Beauty</p>
        <p className="text-xs text-white/50">Lounge — Admin</p>
      </div>
      <ul className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map((item, i) => (
          <li key={item}>
            <button
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                i === 0 ? "bg-burdeos text-white" : "text-white/70 hover:bg-navy-light"
              }`}
            >
              {item}
            </button>
          </li>
        ))}
      </ul>
      <div className="border-t border-white/10 px-5 py-4 text-xs text-white/50">
        <p>Sucursal Miraflores</p>
        {onLogout && (
          <button onClick={onLogout} className="mt-2 text-white/70 hover:text-white hover:underline">
            Cerrar sesión
          </button>
        )}
      </div>
    </nav>
  );
}

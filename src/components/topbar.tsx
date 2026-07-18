import { Bell, Mail, Search } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";

export function Topbar() {
  const { user } = useAuth();
  const avatarChar = (user?.email?.[0] ?? "R").toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-ry-line bg-card px-4 md:px-7 py-3">
      <div className="flex items-center gap-2.5 flex-1 max-w-[380px] rounded-[10px] border border-ry-line bg-ry-bg px-3.5 py-2 text-ry-ink-soft">
        <Search className="h-3.5 w-3.5" />
        <input
          placeholder="Buscar cliente, profissional ou serviço…"
          className="flex-1 border-none bg-transparent text-[12.5px] text-ry-ink outline-none placeholder:text-ry-ink-soft"
        />
      </div>
      <div className="ml-auto flex items-center gap-3.5">
        <button className="grid h-9 w-9 place-items-center rounded-[10px] border border-ry-line bg-card text-ry-ink-soft hover:border-ry-blue-500 hover:text-ry-blue-600 transition-colors">
          <Mail className="h-4 w-4" />
        </button>
        <button className="relative grid h-9 w-9 place-items-center rounded-[10px] border border-ry-line bg-card text-ry-ink-soft hover:border-ry-blue-500 hover:text-ry-blue-600 transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 rounded-full border-2 border-white bg-ry-accent px-1 text-[9px] font-semibold text-white">
            3
          </span>
        </button>
        <div
          className="grid h-9 w-9 place-items-center rounded-full text-[13px] font-semibold text-white"
          style={{
            background: "linear-gradient(135deg, var(--ry-blue-500), var(--ry-blue-900))",
          }}
        >
          {avatarChar}
        </div>
      </div>
    </header>
  );
}

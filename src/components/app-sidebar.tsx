import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarDays,
  ListChecks,
  Users,
  UserCog,
  Scissors,
  Ban,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { initials } from "@/lib/utils";

const menuMain = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/agendamentos", label: "Agendamentos", icon: ListChecks },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/profissionais", label: "Profissionais", icon: UserCog },
  { to: "/servicos", label: "Serviços", icon: Scissors },
  { to: "/bloqueios", label: "Bloqueios", icon: Ban },
] as const;

const menuManage = [
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

function BrandMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 100 100" fill="none">
      <path
        d="M83 46c0 20-15 34-35 34H22V46c0-20 14-34 33-34 8 0 15 2 21 7"
        stroke="#fff"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="80" cy="17" r="7" fill="#fff" />
    </svg>
  );
}

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const email = user?.email ?? "";
  const displayName = email ? email.split("@")[0] : "Minha conta";
  const avatar = email ? initials(email.replace(/[.@_-]/g, " ")) : "RE";

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  const renderItem = (item: { to: string; label: string; icon: typeof LayoutDashboard }) => {
    const Icon = item.icon;
    const active = pathname === item.to;
    return (
      <Link
        key={item.to}
        to={item.to}
        className={[
          "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[12.5px] transition-colors mb-0.5",
          active
            ? "bg-white/15 text-white font-medium shadow-[inset_3px_0_0_#fff]"
            : "text-white/75 hover:bg-white/10 hover:text-white",
        ].join(" ")}
      >
        <Icon className="h-[15px] w-[15px] shrink-0 opacity-90" strokeWidth={2} />
        {item.label}
      </Link>
    );
  };

  return (
    <aside
      className="hidden md:flex sticky top-0 h-screen w-[236px] shrink-0 flex-col text-white overflow-hidden relative"
      style={{
        background:
          "linear-gradient(178deg, var(--ry-blue-600) 0%, var(--ry-blue-700) 55%, var(--ry-blue-900) 100%)",
      }}
    >
      <div className="pointer-events-none absolute -bottom-[140px] -right-[140px] h-[320px] w-[320px] rounded-full bg-white/5" />

      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4 relative z-10">
        <BrandMark />
        <span className="font-logo text-[21px] font-medium tracking-wide translate-y-[1px]">
          replyon
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 relative z-10">
        <div className="font-display text-[10px] tracking-[2.5px] uppercase text-white/45 px-3 pt-3 pb-2">
          Menu principal
        </div>
        {menuMain.map(renderItem)}

        <div className="font-display text-[10px] tracking-[2.5px] uppercase text-white/45 px-3 pt-4 pb-2">
          Gestão
        </div>
        {menuManage.map(renderItem)}
      </nav>

      <div className="flex items-center gap-2.5 px-5 py-4 border-t border-white/10 relative z-10">
        <div className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-white/15 font-display text-[13px] font-medium">
          {avatar}
        </div>
        <div className="min-w-0 flex-1">
          <b className="block text-[12px] font-medium capitalize truncate">{displayName}</b>
          <span className="text-[10.5px] text-white/55 truncate block">{email || "—"}</span>
        </div>
        <button
          onClick={handleLogout}
          title="Sair"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}

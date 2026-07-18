import { Loader2, AlertCircle, Inbox } from "lucide-react";
import { ApiError } from "@/lib/api/client";

/** Centered spinner block, sized to sit inside a card/section. */
export function LoadingState({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-[12px] text-ry-ink-soft">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const message =
    error instanceof ApiError
      ? error.message
      : "Não foi possível carregar os dados.";
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <AlertCircle className="h-5 w-5 text-danger" />
      <p className="text-[12px] text-ry-ink-soft">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 rounded-[10px] border border-ry-line bg-white px-3 py-1.5 text-[11.5px] text-ry-ink hover:border-ry-blue-500 hover:text-ry-blue-600"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function EmptyState({ label = "Nenhum registro encontrado." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-ry-ink-soft">
      <Inbox className="h-5 w-5" />
      <p className="text-[12px]">{label}</p>
    </div>
  );
}

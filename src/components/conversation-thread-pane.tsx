import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, LogOut, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useConversationThread, useResolveHandoff, useSendHumanReply } from "@/lib/api/hooks/conversations";
import { AvailabilityLookupPopover } from "@/components/availability-lookup-popover";
import { cn } from "@/lib/utils";

/** Right-pane thread view: history + composer + "encerrar atendimento". */
export function ConversationThreadPane({
  phone,
  customerId,
  customerName,
  onResolved,
}: {
  phone: string | null;
  customerId?: number | null;
  customerName?: string | null;
  onResolved: () => void;
}) {
  const [reply, setReply] = useState("");
  const { data: messages, isLoading } = useConversationThread(phone);
  const sendReply = useSendHumanReply(phone);
  const resolveHandoff = useResolveHandoff(phone);

  const scrollRef = useRef<HTMLDivElement>(null);
  const previousPhoneRef = useRef(phone);

  // Jumps to the newest message on load, on every poll while already near the
  // bottom, and always when switching to a different conversation — but not
  // when staff has scrolled up to read history and a poll brings new rows in.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const switchedConversation = previousPhoneRef.current !== phone;
    previousPhoneRef.current = phone;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (switchedConversation || distanceFromBottom < 150) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, phone]);

  function handleSend() {
    if (!reply.trim()) return;
    sendReply.mutate(reply.trim(), { onSuccess: () => setReply("") });
  }

  // Appends rather than replaces: an attendant may already be mid-message
  // when they look up availability.
  function handleInsertAvailability(text: string) {
    setReply((prev) => (prev.trim() ? `${prev}\n${text}` : text));
  }

  if (!phone) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-ry-ink-soft">
        <MessageCircle className="h-8 w-8 opacity-40" />
        <p className="text-[12.5px]">Selecione uma conversa para ver o histórico</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-ry-line px-4 py-3.5">
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-medium">{customerName || phone}</p>
          <p className="truncate font-mono text-[11px] text-ry-ink-soft">{phone}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <AvailabilityLookupPopover phone={phone} customerId={customerId} onInsert={handleInsertAvailability} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0 rounded-[10px]">
                <LogOut className="mr-1 h-3.5 w-3.5" />
                Encerrar atendimento
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Encerrar este atendimento?</AlertDialogTitle>
                <AlertDialogDescription>
                  A conversa sai da fila de atendimento e o bot volta a responder normalmente na
                  próxima mensagem do cliente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => resolveHandoff.mutate(undefined, { onSuccess: onResolved })}>
                  Encerrar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-ry-bg p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-ry-ink-soft">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : !messages || messages.length === 0 ? (
          <p className="py-8 text-center text-[12px] text-ry-ink-soft">Nenhuma mensagem ainda.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={cn("flex", m.direction === "IN" ? "justify-start" : "justify-end")}>
              <div
                className={cn(
                  "max-w-[75%] rounded-[10px] px-3 py-2 text-[12.5px] shadow-sm",
                  m.direction === "IN"
                    ? "bg-white text-ry-ink"
                    : m.senderType === "HUMAN"
                      ? "bg-ry-blue-600 text-white"
                      : "bg-ry-blue-50 text-ry-blue-900",
                )}
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className="mt-1 text-[10px] opacity-70">
                  {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-ry-line p-3">
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Digite sua resposta…"
          className="min-h-[44px] flex-1 rounded-[10px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          onClick={handleSend}
          disabled={!reply.trim() || sendReply.isPending}
          className="rounded-[10px] bg-ry-blue-600 hover:bg-ry-blue-700"
        >
          {sendReply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

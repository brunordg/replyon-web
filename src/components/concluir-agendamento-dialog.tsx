import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useCompleteAppointment } from "@/lib/api/hooks/appointments";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from "@/lib/api/status";
import type { PaymentMethod } from "@/lib/api/types";

interface ConcluirAgendamentoDialogProps {
  /** O agendamento sendo concluído; o diálogo fica aberto sempre que isso está definido. */
  appointmentId: number | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Confirma a conclusão de um agendamento solicitando a forma de pagamento —
 * obrigatória, já que o backend rejeita uma conclusão sem ela. Controlado a
 * partir do botão "Concluir" da linha pai, em vez de ter seu próprio gatilho.
 */
export function ConcluirAgendamentoDialog({ appointmentId, onOpenChange }: ConcluirAgendamentoDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const completeAppointment = useCompleteAppointment();

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) setPaymentMethod("");
  }

  function handleConfirm() {
    if (!appointmentId || !paymentMethod) return;
    completeAppointment.mutate(
      { id: appointmentId, paymentMethod },
      { onSuccess: () => handleOpenChange(false) },
    );
  }

  return (
    <Dialog open={appointmentId != null} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-[14px]">
        <DialogHeader>
          <DialogTitle>Concluir agendamento</DialogTitle>
          <DialogDescription>
            Informe a forma de pagamento para concluir este atendimento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="concluir-forma-pagamento">Forma de pagamento</Label>
          <Select
            value={paymentMethod}
            onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
          >
            <SelectTrigger id="concluir-forma-pagamento" className="rounded-[10px]">
              <SelectValue placeholder="Selecione a forma de pagamento" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((method) => (
                <SelectItem key={method} value={method}>
                  {PAYMENT_METHOD_LABEL[method]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-[10px]"
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!paymentMethod || completeAppointment.isPending}
            onClick={handleConfirm}
            className="rounded-[10px] bg-ry-blue-600 hover:bg-ry-blue-700"
          >
            {completeAppointment.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2 } from "lucide-react";
import { useCreateService } from "@/lib/api/hooks/services";
import { parsePrice } from "@/lib/utils";
import { PHASES_EXCEED_DURATION_MESSAGE, phasesExceedDuration } from "@/lib/service-phases";

export function NovoServicoDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [parallelCapable, setParallelCapable] = useState(false);
  const [activeMinutesBefore, setActiveMinutesBefore] = useState("");
  const [waitMinutes, setWaitMinutes] = useState("");
  const [errors, setErrors] = useState<{
    name?: string;
    price?: string;
    duration?: string;
    phases?: string;
  }>({});
  const createService = useCreateService();
  const phasesTooLong =
    parallelCapable && phasesExceedDuration(duration, activeMinutesBefore, waitMinutes);
  const phaseError = errors.phases ?? (phasesTooLong ? PHASES_EXCEED_DURATION_MESSAGE : undefined);

  function reset() {
    setName("");
    setDescription("");
    setPrice("");
    setDuration("");
    setParallelCapable(false);
    setActiveMinutesBefore("");
    setWaitMinutes("");
    setErrors({});
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceNum = parsePrice(price);
    const durationNum = Number(duration);
    const activeBeforeNum = Number(activeMinutesBefore);
    const waitNum = Number(waitMinutes);
    const nextErrors: typeof errors = {};

    if (!name.trim()) nextErrors.name = "Informe o nome.";
    if (!price.trim() || Number.isNaN(priceNum) || priceNum < 0.01)
      nextErrors.price = "Preço deve ser ao menos 0,01.";
    if (!duration.trim() || !Number.isInteger(durationNum) || durationNum < 1)
      nextErrors.duration = "Duração deve ser ao menos 1 minuto.";

    if (parallelCapable) {
      if (!activeMinutesBefore.trim() || !Number.isInteger(activeBeforeNum) || activeBeforeNum < 1) {
        nextErrors.phases = "Informe os tempos de fase (mínimo 1 minuto cada).";
      } else if (!waitMinutes.trim() || !Number.isInteger(waitNum) || waitNum < 1) {
        nextErrors.phases = "Informe os tempos de fase (mínimo 1 minuto cada).";
      } else if (phasesExceedDuration(duration, activeMinutesBefore, waitMinutes)) {
        nextErrors.phases = PHASES_EXCEED_DURATION_MESSAGE;
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    createService.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        price: priceNum,
        durationMinutes: durationNum,
        parallelCapable: parallelCapable || undefined,
        activeMinutesBefore: parallelCapable ? activeBeforeNum : undefined,
        waitMinutes: parallelCapable ? waitNum : undefined,
      },
      {
        onSuccess: () => handleOpenChange(false),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="rounded-[10px] gap-2 bg-ry-blue-600 hover:bg-ry-blue-700 shadow-[0_6px_16px_rgba(39,72,217,.28)]">
          <Plus className="h-3.5 w-3.5" /> Novo serviço
        </Button>
      </DialogTrigger>

      <DialogContent className="rounded-[14px]">
        <DialogHeader>
          <DialogTitle>Novo serviço</DialogTitle>
          <DialogDescription>
            Cadastre um serviço do seu catálogo. Nome, preço e duração são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="servico-nome">Nome</Label>
            <Input
              id="servico-nome"
              placeholder="Ex: Corte masculino"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            {errors.name && <p className="text-[11px] text-danger">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="servico-descricao">
              Descrição <span className="text-ry-ink-soft">(opcional)</span>
            </Label>
            <Textarea
              id="servico-descricao"
              placeholder="Breve descrição do serviço"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="servico-preco">Preço (R$)</Label>
              <Input
                id="servico-preco"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, ""))}
              />
              {errors.price && <p className="text-[11px] text-danger">{errors.price}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="servico-duracao">Duração (min)</Label>
              <Input
                id="servico-duracao"
                type="number"
                inputMode="numeric"
                step="1"
                min="1"
                placeholder="30"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
              {errors.duration && <p className="text-[11px] text-danger">{errors.duration}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-[10px] border border-ry-line px-3 py-2.5">
              <div>
                <Label htmlFor="servico-encaixe" className="cursor-pointer">
                  Permite encaixe
                </Label>
                <p className="text-[11px] text-ry-ink-soft">
                  O serviço tem uma etapa em que o profissional fica livre para outro atendimento.
                </p>
              </div>
              <Switch id="servico-encaixe" checked={parallelCapable} onCheckedChange={setParallelCapable} />
            </div>
            {parallelCapable && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="servico-fase-ativa">Fase ativa inicial (min)</Label>
                  <Input
                    id="servico-fase-ativa"
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min="1"
                    placeholder="20"
                    value={activeMinutesBefore}
                    aria-invalid={phasesTooLong || undefined}
                    onChange={(e) => setActiveMinutesBefore(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="servico-fase-espera">Espera livre (min)</Label>
                  <Input
                    id="servico-fase-espera"
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min="1"
                    placeholder="40"
                    value={waitMinutes}
                    aria-invalid={phasesTooLong || undefined}
                    onChange={(e) => setWaitMinutes(e.target.value)}
                  />
                </div>
                {phaseError && (
                  <p role="alert" className="col-span-2 text-[11px] text-danger">
                    {phaseError}
                  </p>
                )}
              </div>
            )}
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
              type="submit"
              disabled={createService.isPending || phasesTooLong}
              className="rounded-[10px] bg-ry-blue-600 hover:bg-ry-blue-700"
            >
              {createService.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Cadastrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

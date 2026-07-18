import { useEffect, useState } from "react";
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
import { Loader2 } from "lucide-react";
import { useUpdateService } from "@/lib/api/hooks/services";
import { parsePrice } from "@/lib/utils";
import type { ServiceResponse } from "@/lib/api/types";

// Formats a number back into a pt-BR editable price string ("45.5" -> "45,50").
function toPriceInput(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function EditarServicoDialog({ service }: { service: ServiceResponse }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(service.name);
  const [description, setDescription] = useState(service.description ?? "");
  const [price, setPrice] = useState(toPriceInput(service.price));
  const [duration, setDuration] = useState(String(service.durationMinutes));
  const [errors, setErrors] = useState<{ name?: string; price?: string; duration?: string }>({});
  const updateService = useUpdateService();

  useEffect(() => {
    if (open) {
      setName(service.name);
      setDescription(service.description ?? "");
      setPrice(toPriceInput(service.price));
      setDuration(String(service.durationMinutes));
      setErrors({});
    }
  }, [open, service]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceNum = parsePrice(price);
    const durationNum = Number(duration);
    const nextErrors: typeof errors = {};

    if (!name.trim()) nextErrors.name = "Informe o nome.";
    if (Number.isNaN(priceNum) || priceNum < 0.01) nextErrors.price = "Preço deve ser ao menos 0,01.";
    if (!Number.isInteger(durationNum) || durationNum < 1)
      nextErrors.duration = "Duração deve ser ao menos 1 minuto.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    updateService.mutate(
      {
        id: service.id,
        body: {
          name: name.trim(),
          description: description.trim() || undefined,
          price: priceNum,
          durationMinutes: durationNum,
        },
      },
      { onSuccess: () => setOpen(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-7 rounded-lg text-[11px] px-2.5">
          Editar
        </Button>
      </DialogTrigger>

      <DialogContent className="rounded-[14px]">
        <DialogHeader>
          <DialogTitle>Editar serviço</DialogTitle>
          <DialogDescription>Atualize os dados de {service.name}.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-servico-nome">Nome</Label>
            <Input
              id="edit-servico-nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            {errors.name && <p className="text-[11px] text-danger">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-servico-descricao">
              Descrição <span className="text-ry-ink-soft">(opcional)</span>
            </Label>
            <Textarea
              id="edit-servico-descricao"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-servico-preco">Preço (R$)</Label>
              <Input
                id="edit-servico-preco"
                type="text"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, ""))}
              />
              {errors.price && <p className="text-[11px] text-danger">{errors.price}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-servico-duracao">Duração (min)</Label>
              <Input
                id="edit-servico-duracao"
                type="number"
                inputMode="numeric"
                step="1"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
              {errors.duration && <p className="text-[11px] text-danger">{errors.duration}</p>}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-[10px]"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateService.isPending}
              className="rounded-[10px] bg-ry-blue-600 hover:bg-ry-blue-700"
            >
              {updateService.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

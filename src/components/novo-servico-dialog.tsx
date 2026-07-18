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
import { Plus, Loader2 } from "lucide-react";
import { useCreateService } from "@/lib/api/hooks/services";
import { parsePrice } from "@/lib/utils";

export function NovoServicoDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [errors, setErrors] = useState<{ name?: string; price?: string; duration?: string }>({});
  const createService = useCreateService();

  function reset() {
    setName("");
    setDescription("");
    setPrice("");
    setDuration("");
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
    const nextErrors: typeof errors = {};

    if (!name.trim()) nextErrors.name = "Informe o nome.";
    if (!price.trim() || Number.isNaN(priceNum) || priceNum < 0.01)
      nextErrors.price = "Preço deve ser ao menos 0,01.";
    if (!duration.trim() || !Number.isInteger(durationNum) || durationNum < 1)
      nextErrors.duration = "Duração deve ser ao menos 1 minuto.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    createService.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        price: priceNum,
        durationMinutes: durationNum,
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
              disabled={createService.isPending}
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

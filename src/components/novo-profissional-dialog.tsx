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
import { UserPlus, Loader2, Check } from "lucide-react";
import { useCreateStaffWithServices } from "@/lib/api/hooks/staff";
import { useServices } from "@/lib/api/hooks/services";
import { cn, formatBRL } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NovoProfissionalDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [selectedServices, setSelectedServices] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const createStaff = useCreateStaffWithServices();
  const { data: servicesPage, isLoading: servicesLoading } = useServices({ size: 200 });
  const services = servicesPage?.content ?? [];

  function reset() {
    setName("");
    setEmail("");
    setPhone("");
    setSpecialties("");
    setSelectedServices(new Set());
    setErrors({});
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function toggleService(id: number) {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: { name?: string; email?: string } = {};
    if (!name.trim()) nextErrors.name = "Informe o nome.";
    if (!email.trim()) nextErrors.email = "Informe o e-mail.";
    else if (!EMAIL_RE.test(email.trim())) nextErrors.email = "E-mail inválido.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const specialtiesList = specialties
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    createStaff.mutate(
      {
        staff: {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          specialties: specialtiesList.length > 0 ? specialtiesList : undefined,
        },
        serviceIds: [...selectedServices],
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
          <UserPlus className="h-3.5 w-3.5" /> Novo profissional
        </Button>
      </DialogTrigger>

      <DialogContent className="rounded-[14px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo profissional</DialogTitle>
          <DialogDescription>
            Cadastre um profissional e associe os serviços que ele presta.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pro-nome">Nome</Label>
            <Input
              id="pro-nome"
              placeholder="Nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            {errors.name && <p className="text-[11px] text-danger">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pro-email">E-mail</Label>
              <Input
                id="pro-email"
                type="email"
                placeholder="profissional@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {errors.email && <p className="text-[11px] text-danger">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pro-telefone">
                Telefone <span className="text-ry-ink-soft">(opcional)</span>
              </Label>
              <Input
                id="pro-telefone"
                placeholder="(11) 90000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pro-especialidades">
              Especialidades <span className="text-ry-ink-soft">(opcional, separadas por vírgula)</span>
            </Label>
            <Input
              id="pro-especialidades"
              placeholder="Ex: Cabelo, Barba, Estética"
              value={specialties}
              onChange={(e) => setSpecialties(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Serviços que presta{" "}
              <span className="text-ry-ink-soft">
                ({selectedServices.size} selecionado{selectedServices.size === 1 ? "" : "s"})
              </span>
            </Label>
            {servicesLoading ? (
              <p className="text-[12px] text-ry-ink-soft py-2">Carregando serviços…</p>
            ) : services.length === 0 ? (
              <p className="text-[12px] text-ry-ink-soft py-2">
                Nenhum serviço cadastrado. Cadastre serviços primeiro para associá-los.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto rounded-[10px] border border-ry-line p-2.5">
                {services.map((s) => {
                  const selected = selectedServices.has(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleService(s.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] transition",
                        selected
                          ? "border-ry-blue-500 bg-ry-blue-50 text-ry-blue-600 font-medium"
                          : "border-ry-line bg-white text-ry-ink-soft hover:border-ry-blue-300",
                      )}
                    >
                      {selected && <Check className="h-3 w-3" />}
                      {s.name}
                      <span className="text-ry-ink-soft">· {formatBRL(s.price)}</span>
                    </button>
                  );
                })}
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
              disabled={createStaff.isPending}
              className="rounded-[10px] bg-ry-blue-600 hover:bg-ry-blue-700"
            >
              {createStaff.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Cadastrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useRef, useState } from "react";
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
import { Loader2, Check } from "lucide-react";
import { useStaffServices, useUpdateStaffWithServices } from "@/lib/api/hooks/staff";
import { useServices } from "@/lib/api/hooks/services";
import { cn, formatBRL } from "@/lib/utils";
import type { StaffResponse } from "@/lib/api/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EditarProfissionalDialog({ staff }: { staff: StaffResponse }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(staff.name);
  const [email, setEmail] = useState(staff.email);
  const [phone, setPhone] = useState(staff.phone ?? "");
  const [specialties, setSpecialties] = useState(staff.specialties.join(", "));
  const [selectedServices, setSelectedServices] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const updateStaff = useUpdateStaffWithServices();
  const { data: servicesPage, isLoading: servicesLoading } = useServices({ size: 200 });
  const services = servicesPage?.content ?? [];
  const { data: currentServiceIds, isLoading: currentLoading } = useStaffServices(staff.id, open);

  // Reseed text fields whenever the dialog opens.
  useEffect(() => {
    if (open) {
      setName(staff.name);
      setEmail(staff.email);
      setPhone(staff.phone ?? "");
      setSpecialties(staff.specialties.join(", "));
      setErrors({});
    }
  }, [open, staff]);

  // Seed the selected services once the current assignments load (once per open).
  const seeded = useRef(false);
  useEffect(() => {
    if (!open) {
      seeded.current = false;
      return;
    }
    if (!seeded.current && currentServiceIds) {
      setSelectedServices(new Set(currentServiceIds));
      seeded.current = true;
    }
  }, [open, currentServiceIds]);

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

    updateStaff.mutate(
      {
        id: staff.id,
        body: {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          specialties: specialtiesList,
        },
        serviceIds: [...selectedServices],
        currentServiceIds: currentServiceIds ?? [],
      },
      { onSuccess: () => setOpen(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex-1 rounded-[10px] text-[11.5px] h-8">
          Editar
        </Button>
      </DialogTrigger>

      <DialogContent className="rounded-[14px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar profissional</DialogTitle>
          <DialogDescription>Atualize os dados e os serviços de {staff.name}.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-pro-nome">Nome</Label>
            <Input
              id="edit-pro-nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            {errors.name && <p className="text-[11px] text-danger">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-pro-email">E-mail</Label>
              <Input
                id="edit-pro-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {errors.email && <p className="text-[11px] text-danger">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-pro-telefone">
                Telefone <span className="text-ry-ink-soft">(opcional)</span>
              </Label>
              <Input
                id="edit-pro-telefone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-pro-especialidades">
              Especialidades <span className="text-ry-ink-soft">(separadas por vírgula)</span>
            </Label>
            <Input
              id="edit-pro-especialidades"
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
            {servicesLoading || currentLoading ? (
              <p className="text-[12px] text-ry-ink-soft py-2">Carregando serviços…</p>
            ) : services.length === 0 ? (
              <p className="text-[12px] text-ry-ink-soft py-2">Nenhum serviço cadastrado.</p>
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
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateStaff.isPending}
              className="rounded-[10px] bg-ry-blue-600 hover:bg-ry-blue-700"
            >
              {updateStaff.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

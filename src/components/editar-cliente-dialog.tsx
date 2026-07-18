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
import { Pencil, Loader2 } from "lucide-react";
import { useUpdateCustomer } from "@/lib/api/hooks/customers";
import type { CustomerResponse } from "@/lib/api/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EditarClienteDialog({ customer }: { customer: CustomerResponse }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(customer.name);
  const [email, setEmail] = useState(customer.email);
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const updateCustomer = useUpdateCustomer();

  // Reseed the form from the customer whenever the dialog opens.
  useEffect(() => {
    if (open) {
      setName(customer.name);
      setEmail(customer.email);
      setPhone(customer.phone ?? "");
      setErrors({});
    }
  }, [open, customer]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: { name?: string; email?: string } = {};
    if (!name.trim()) nextErrors.name = "Informe o nome.";
    if (!email.trim()) nextErrors.email = "Informe o e-mail.";
    else if (!EMAIL_RE.test(email.trim())) nextErrors.email = "E-mail inválido.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    updateCustomer.mutate(
      {
        id: customer.id,
        body: { name: name.trim(), email: email.trim(), phone: phone.trim() || undefined },
      },
      { onSuccess: () => setOpen(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          title="Editar"
          className="grid h-7 w-7 place-items-center rounded-lg border border-ry-line bg-white text-ry-ink-soft transition-colors hover:border-ry-blue-500 hover:text-ry-blue-600"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>

      <DialogContent className="rounded-[14px]">
        <DialogHeader>
          <DialogTitle>Editar cliente</DialogTitle>
          <DialogDescription>Atualize os dados de {customer.name}.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-cliente-nome">Nome</Label>
            <Input
              id="edit-cliente-nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            {errors.name && <p className="text-[11px] text-danger">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-cliente-email">E-mail</Label>
            <Input
              id="edit-cliente-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && <p className="text-[11px] text-danger">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-cliente-telefone">
              Telefone <span className="text-ry-ink-soft">(opcional)</span>
            </Label>
            <Input
              id="edit-cliente-telefone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
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
              disabled={updateCustomer.isPending}
              className="rounded-[10px] bg-ry-blue-600 hover:bg-ry-blue-700"
            >
              {updateCustomer.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

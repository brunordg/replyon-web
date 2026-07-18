import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { customersApi } from "../customers";
import { ApiError } from "../client";
import type {
  CreateCustomerRequest,
  ListParams,
  UpdateCustomerRequest,
} from "../types";

const KEY = "customers";

export function useCustomers(params?: ListParams) {
  return useQuery({
    queryKey: [KEY, params ?? {}],
    queryFn: ({ signal }) => customersApi.list(params, signal),
    placeholderData: (prev) => prev,
  });
}

function errMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCustomerRequest) => customersApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Cliente criado");
    },
    onError: (err) => toast.error(errMessage(err, "Não foi possível criar o cliente")),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateCustomerRequest }) =>
      customersApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Cliente atualizado");
    },
    onError: (err) => toast.error(errMessage(err, "Não foi possível atualizar o cliente")),
  });
}

export function useSetCustomerStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      active ? customersApi.activate(id) : customersApi.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Status atualizado");
    },
    onError: (err) => toast.error(errMessage(err, "Não foi possível alterar o status")),
  });
}

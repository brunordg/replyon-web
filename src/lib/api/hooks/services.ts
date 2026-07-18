import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { servicesApi } from "../services";
import { ApiError } from "../client";
import type {
  CreateServiceRequest,
  ListParams,
  UpdateServiceRequest,
} from "../types";

const KEY = "services";

function errMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export function useServices(params?: ListParams) {
  return useQuery({
    queryKey: [KEY, params ?? {}],
    queryFn: ({ signal }) => servicesApi.list(params, signal),
    placeholderData: (prev) => prev,
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateServiceRequest) => servicesApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Serviço criado");
    },
    onError: (err) => toast.error(errMessage(err, "Não foi possível criar o serviço")),
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateServiceRequest }) =>
      servicesApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Serviço atualizado");
    },
    onError: (err) => toast.error(errMessage(err, "Não foi possível atualizar o serviço")),
  });
}

export function useSetServiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      active ? servicesApi.activate(id) : servicesApi.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Status atualizado");
    },
    onError: (err) => toast.error(errMessage(err, "Não foi possível alterar o status")),
  });
}

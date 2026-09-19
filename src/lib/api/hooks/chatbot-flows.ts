import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Shape retornado por list/create/publish/activate (ChatbotFlowResponse no backend) —
// metadados do fluxo, sem nós/edges.
export interface ChatbotFlow {
  id: string;
  name: string;
  description?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

// Shape retornado por get/update (ChatbotFlowDefinitionResponse no backend) — nós/edges
// no nível raiz, não aninhados em "definition". Usar este tipo (não ChatbotFlow) para
// alimentar o editor visual.
export interface ChatbotFlowDefinition {
  nodes: any[];
  edges: any[];
  rootNodeId: string;
  validation: { nodeId: string | null; field: string; message: string }[];
}

export interface CreateFlowDTO {
  name: string;
  description: string;
  definition: {
    nodes: any[];
    edges: any[];
    rootNodeId: string;
  };
}

export interface UpdateFlowDTO {
  definition: {
    nodes: any[];
    edges: any[];
    rootNodeId: string;
  };
}

// List all flows for current tenant
export function useChatbotFlows() {
  return useQuery({
    queryKey: ["chatbot-flows"],
    queryFn: async () => {
      return await apiClient.get<ChatbotFlow[]>("/v1/chatbot-flows");
    },
  });
}

// Get single flow's definition (nodes/edges/rootNodeId) — o que o editor visual precisa.
// A lista (useChatbotFlows) só traz metadados; sem isso, reabrir um fluxo salvo mostrava
// o canvas vazio mesmo com os dados persistidos no banco.
export function useChatbotFlow(flowId: string | null) {
  return useQuery({
    queryKey: ["chatbot-flows", flowId],
    queryFn: async () => {
      if (!flowId) return null;
      return await apiClient.get<ChatbotFlowDefinition>(`/v1/chatbot-flows/${flowId}`);
    },
    enabled: !!flowId,
  });
}

// Create new flow
export function useCreateFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFlowDTO) => {
      const response = await apiClient.post<ChatbotFlow>("/v1/chatbot-flows", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-flows"] });
    },
  });
}

// Update flow (draft only) — returns the updated definition, not the flow metadata
export function useUpdateFlow(flowId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateFlowDTO) => {
      const response = await apiClient.put<ChatbotFlowDefinition>(`/v1/chatbot-flows/${flowId}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-flows"] });
      queryClient.invalidateQueries({ queryKey: ["chatbot-flows", flowId] });
    },
  });
}

// Publish flow (make it active)
export function usePublishFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flowId: string) => {
      const response = await apiClient.post<ChatbotFlow>(`/v1/chatbot-flows/${flowId}/publish`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-flows"] });
    },
  });
}

// Delete flow permanently — cannot be undone, the record is removed from the database.
export function useDeleteFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flowId: string) => {
      await apiClient.delete(`/v1/chatbot-flows/${flowId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-flows"] });
    },
  });
}

// Archive flow — reversible, the record stays in the database with status ARCHIVED.
export function useArchiveFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flowId: string) => {
      const response = await apiClient.post<ChatbotFlow>(`/v1/chatbot-flows/${flowId}/archive`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-flows"] });
    },
  });
}

// Activate a previous flow
export function useActivateFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flowId: string) => {
      const response = await apiClient.post<ChatbotFlow>(`/v1/chatbot-flows/${flowId}/activate`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-flows"] });
    },
  });
}

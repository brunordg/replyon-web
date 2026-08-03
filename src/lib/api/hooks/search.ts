import { useQuery } from "@tanstack/react-query";
import { searchApi } from "../search";

const KEY = "search";

/** Tamanho mínimo do termo; combina com a própria checagem da API. */
export const MIN_SEARCH_LENGTH = 2;

/**
 * Resultados de busca global para `q`.
 *
 * `enabled` permite que quem chama pare de consultar enquanto a paleta está
 * fechada, e `placeholderData` mantém os resultados anteriores na tela entre
 * as teclas digitadas para que a lista não pisque vazia a cada refetch.
 */
export function useGlobalSearch(q: string, enabled = true) {
  return useQuery({
    queryKey: [KEY, q],
    queryFn: ({ signal }) => searchApi.global(q, 5, signal),
    enabled: enabled && q.length >= MIN_SEARCH_LENGTH,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

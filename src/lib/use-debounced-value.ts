import { useEffect, useState } from "react";

/**
 * O valor, estabilizado — só atualiza depois que `value` parar de mudar por
 * `delay` ms.
 *
 * Toda caixa de busca do app alimenta uma consulta ao servidor, então sem isso
 * cada tecla digitada vira uma requisição. 350 ms é o delay que /clientes
 * sempre usou; mantê-lo idêntico em todo lugar faz o app "digitar" numa
 * velocidade só.
 */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

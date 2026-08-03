// Decodificação mínima do payload do JWT (sem verificação de assinatura — apenas para exibição).
// O token HS256 do backend carrega: iss, sub (email do usuário), user_id, tenant_id, iat, exp.

export interface JwtClaims {
  sub?: string;
  user_id?: number;
  tenant_id?: number;
  exp?: number;
  iat?: number;
  iss?: string;
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 ? "=".repeat(4 - (padded.length % 4)) : "";
  const base64 = padded + pad;
  if (typeof atob === "function") {
    return decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join(""),
    );
  }
  // Fallback para SSR / Node
  return Buffer.from(base64, "base64").toString("utf-8");
}

export function decodeJwt(token: string): JwtClaims | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    return JSON.parse(base64UrlDecode(payload)) as JwtClaims;
  } catch {
    return null;
  }
}

/** True quando o token tem uma claim exp no passado. */
export function isExpired(claims: JwtClaims | null): boolean {
  if (!claims?.exp) return false;
  return claims.exp * 1000 <= Date.now();
}

/**
 * Limites de usuários por plano.
 * null = ilimitado.
 *
 * Estes são os defaults — o admin da plataforma pode sobrescrever
 * por empresa via campo `maxUsers` em `companies`.
 */
export const PLAN_LIMITS: Record<string, number | null> = {
  FREE:         3,
  STARTER:      10,
  PROFESSIONAL: 30,
  ENTERPRISE:   null,
}

/**
 * Retorna o limite efetivo de usuários para uma empresa.
 * `maxUsersOverride` (campo `companies.max_users`) tem precedência sobre o plano.
 */
export function getUserLimit(
  plan: string,
  maxUsersOverride: number | null | undefined,
): number | null {
  if (maxUsersOverride != null) return maxUsersOverride
  return PLAN_LIMITS[plan] ?? 3
}

export const PLAN_LABEL: Record<string, string> = {
  FREE:         "Free",
  STARTER:      "Starter",
  PROFESSIONAL: "Professional",
  ENTERPRISE:   "Enterprise",
}

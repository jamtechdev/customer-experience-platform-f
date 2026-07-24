/**
 * Resolve the signed-in user's company.
 * Returns 0 when missing — never invents tenant id 1.
 */
export function resolveAppCompanyId(
  user: { role?: string; settings?: { companyId?: number } } | null | undefined
): number {
  const fromSettings = Number(user?.settings?.companyId);
  if (Number.isInteger(fromSettings) && fromSettings > 0) {
    return fromSettings;
  }
  return 0;
}

/** True when the user has a valid company assignment. */
export function hasAppCompanyId(
  user: { role?: string; settings?: { companyId?: number } } | null | undefined
): boolean {
  return resolveAppCompanyId(user) > 0;
}

/** Use when a company id is mandatory for the request. */
export function requireAppCompanyId(
  user: { role?: string; settings?: { companyId?: number } } | null | undefined
): number {
  const id = resolveAppCompanyId(user);
  if (id <= 0) {
    throw new Error('User is not assigned to a company');
  }
  return id;
}

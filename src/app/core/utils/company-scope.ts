/** Default tenant when user.settings.companyId is missing. */
export const DEFAULT_APP_COMPANY_ID = 1;

export function resolveAppCompanyId(
  user: { role?: string; settings?: { companyId?: number } } | null | undefined
): number {
  const fromSettings = Number(user?.settings?.companyId);
  if (Number.isInteger(fromSettings) && fromSettings > 0) {
    return fromSettings;
  }
  return DEFAULT_APP_COMPANY_ID;
}

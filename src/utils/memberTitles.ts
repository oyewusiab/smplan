import { formatHonorificName, stripAllHonorifics } from './memberTitle';

/**
 * Utility for formatting Latter-day Saint church titles and respectful prefixes.
 */

export function getRoleDisplayTitle(role?: string, calling?: string): string {
  if (!role) return 'Member';
  const r = role.toUpperCase();
  if (r === 'ADMIN') return 'Bishop';
  if (r === 'BISHOPRIC') return calling || 'Bishopric';
  if (r === 'CLERK') return 'Ward Clerk';
  if (r === 'SECRETARY') return 'Executive Secretary';
  if (r === 'MUSIC') return 'Music Leader';
  return calling || role;
}

export function formatMemberTitle(
  name?: string,
  gender?: 'M' | 'F' | string,
  calling?: string,
  role?: string
): string {
  return formatHonorificName(name, { gender, calling, role });
}

export { stripAllHonorifics, formatHonorificName };

import type { Member } from '../types';

/**
 * Strips all prefixes (Brother, Sister, Elder, Bishop, President, Patriarch, Bro, Sis, Pres, Bp, Eld)
 * even if accidentally stacked (e.g. "Brother Bishop Adebayo Oyewusi" -> baseName: "Adebayo Oyewusi", detectedTitle: "Bishop")
 */
export function stripAllHonorifics(rawName?: string | null): { baseName: string; detectedTitle?: string } {
  if (!rawName || !rawName.trim()) return { baseName: '' };
  let clean = rawName.trim();
  let highestTitle: string | undefined = undefined;

  const prefixRegex = /^(brother|sister|elder|bishop|president|patriarch|bro\.|bro|sis\.|sis|eld\.|eld|bp\.|bp|pres\.|pres)\s+/i;
  let match;
  while ((match = clean.match(prefixRegex))) {
    const rawP = match[1].toLowerCase();
    if (rawP.startsWith('bp') || rawP.startsWith('bishop')) {
      highestTitle = 'Bishop';
    } else if (rawP.startsWith('pres') && highestTitle !== 'Bishop') {
      highestTitle = 'President';
    } else if (rawP.startsWith('patr') && !['Bishop', 'President'].includes(highestTitle || '')) {
      highestTitle = 'Patriarch';
    } else if (rawP.startsWith('eld') && !['Bishop', 'President', 'Patriarch'].includes(highestTitle || '')) {
      highestTitle = 'Elder';
    } else if (rawP.startsWith('sis') && !['Bishop', 'President', 'Patriarch'].includes(highestTitle || '')) {
      highestTitle = 'Sister';
    } else if (rawP.startsWith('bro') && !highestTitle) {
      highestTitle = 'Brother';
    }
    clean = clean.substring(match[0].length).trim();
  }

  return { baseName: clean, detectedTitle: highestTitle };
}

/**
 * Ensures a name always includes its single respectful LDS title/prefix
 * (Bishop, President, Patriarch, Elder, Sister, Brother).
 * Calling-based titles ALWAYS supersede gender-based titles.
 * Multiple stacked titles (e.g. "Brother Bishop") are strictly prevented.
 */
export function formatHonorificName(
  name?: string | null,
  memberOrCallingOrOptions?: Member | string | {
    calling?: string;
    gender?: string;
    role?: string;
    priesthood_office?: string;
    members_id?: string;
    member_id?: string;
  } | null,
  genderFallback?: string | null
): string {
  if (!name || !name.trim()) return '';

  const { baseName, detectedTitle } = stripAllHonorifics(name);
  if (!baseName) return '';

  let calling = '';
  let gender = genderFallback || '';
  let role = '';
  let priesthoodOffice = '';

  if (typeof memberOrCallingOrOptions === 'string') {
    calling = memberOrCallingOrOptions;
  } else if (memberOrCallingOrOptions && typeof memberOrCallingOrOptions === 'object') {
    calling = memberOrCallingOrOptions.calling || '';
    if (!gender && memberOrCallingOrOptions.gender) {
      gender = memberOrCallingOrOptions.gender;
    }
    if ('role' in memberOrCallingOrOptions && memberOrCallingOrOptions.role) {
      role = String(memberOrCallingOrOptions.role);
    }
    if ('priesthood_office' in memberOrCallingOrOptions && memberOrCallingOrOptions.priesthood_office) {
      priesthoodOffice = String(memberOrCallingOrOptions.priesthood_office);
    }
  }

  // 1. Calling / Role Priority 1: Bishop (always Bishop, never Brother Bishop)
  if (
    detectedTitle === 'Bishop' ||
    role === 'ADMIN' ||
    /bishop/i.test(calling) ||
    /bishop/i.test(priesthoodOffice)
  ) {
    return `Bishop ${baseName}`;
  }

  // 2. Calling / Role Priority 2: President (Stake/District/Branch/Mission/Temple/Area Presidency)
  if (
    detectedTitle === 'President' ||
    /stake president|district president|branch president|mission president|temple president|area president/i.test(calling) ||
    /stake presidency|district presidency|branch presidency/i.test(calling)
  ) {
    return `President ${baseName}`;
  }

  // 3. Priesthood Office: Patriarch
  if (
    detectedTitle === 'Patriarch' ||
    /patriarch/i.test(calling) ||
    /patriarch/i.test(priesthoodOffice)
  ) {
    return `Patriarch ${baseName}`;
  }

  // 4. Calling / Office: Elder (Full-Time Missionary or Elder)
  if (
    detectedTitle === 'Elder' ||
    /full[- ]time missionary|missionary/i.test(calling)
  ) {
    return `Elder ${baseName}`;
  }

  // 5. Gender / Auxiliary Priority: Sister
  const gUpper = String(gender).toUpperCase();
  if (
    detectedTitle === 'Sister' ||
    gUpper === 'F' ||
    gUpper === 'FEMALE' ||
    /relief society|young women|primary/i.test(calling)
  ) {
    return `Sister ${baseName}`;
  }

  // 6. Default to Brother for male/general leaders
  return `Brother ${baseName}`;
}

/**
 * Formats a member dropdown/datalist label with title and calling
 */
export function getMemberDisplayWithTitle(member: Member): string {
  const titleName = formatHonorificName(member.name, member);
  const idBadge = (member.members_id || member.member_id) ? ` #${member.members_id || member.member_id}` : '';
  return member.calling ? `${titleName}${idBadge} (${member.calling})` : `${titleName}${idBadge}`;
}

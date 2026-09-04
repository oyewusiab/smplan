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

/**
 * Tokenizes a name by stripping titles, punctuation, commas, and converting to lowercase tokens.
 */
export function tokenizeName(name?: string | null): string[] {
  if (!name || !name.trim()) return [];
  return name
    .toLowerCase()
    .replace(/^(brother|sister|elder|bishop|president|patriarch|bro\.|bro|sis\.|sis|eld\.|eld|bp\.|bp|pres\.|pres)\s+/i, '')
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0 && !/^(brother|sister|elder|bishop|president|patriarch|bro|sis|eld|bp|pres)$/.test(token));
}

/**
 * Robust name matcher that matches across "Last, First", "First Last", titles, and initials.
 */
export function namesMatch(nameA?: string | null, nameB?: string | null): boolean {
  if (!nameA || !nameB) return false;
  const rawA = nameA.trim().toLowerCase();
  const rawB = nameB.trim().toLowerCase();
  if (rawA === rawB) return true;

  const tokensA = tokenizeName(nameA);
  const tokensB = tokenizeName(nameB);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  // Exact normalized token comparison
  const strA = tokensA.join(' ');
  const strB = tokensB.join(' ');
  if (strA === strB) return true;

  // Set-based token intersection
  const setB = new Set(tokensB);
  const setA = new Set(tokensA);
  const intersect = tokensA.filter((t) => setB.has(t));

  // If both have 2+ name tokens and share at least 2 tokens (e.g. First and Last name in any order)
  if (tokensA.length >= 2 && tokensB.length >= 2 && intersect.length >= 2) {
    return true;
  }

  // If one name is a subset of the other
  if (tokensA.length > 0 && tokensA.every((t) => setB.has(t))) return true;
  if (tokensB.length > 0 && tokensB.every((t) => setA.has(t))) return true;

  // Handle single-token or initial match (e.g. "Oyewusi" or "Adebayo")
  if (tokensA.length === 1 && tokensB.includes(tokensA[0]) && tokensA[0].length >= 3) return true;
  if (tokensB.length === 1 && tokensA.includes(tokensB[0]) && tokensB[0].length >= 3) return true;

  return false;
}

/**
 * Searches a list of members for a matching member record using robust name matching.
 */
export function findMemberInList(name?: string | null, members: Member[] = []): Member | undefined {
  if (!name || !name.trim() || members.length === 0) return undefined;
  return members.find((m) => namesMatch(m.name, name));
}

/**
 * Finds a member's email address by name using robust matching across the directory.
 */
export function getMemberEmail(name?: string | null, members: Member[] = []): string {
  const match = findMemberInList(name, members);
  return match?.email?.trim() || '';
}

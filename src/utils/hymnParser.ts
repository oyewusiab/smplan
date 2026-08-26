/**
 * Hymn & Person Parsing Utilities for Sacrament Meeting Agendas
 */

export interface ParsedHymn {
  number: string;
  title: string;
  raw: string;
}

/**
 * Intelligently parse raw hymn strings like:
 * - "169 - As Now We Take the Sacrament"
 * - "#169 As Now We Take the Sacrament"
 * - "169. As Now We Take the Sacrament"
 * - "As Now We Take the Sacrament (169)"
 * - "169"
 * - "As Now We Take the Sacrament"
 */
export function parseHymn(raw: string | undefined | null): ParsedHymn {
  if (!raw) return { number: '', title: '', raw: '' };
  const str = String(raw).trim();

  // Pattern 1: Starts with digits/hash e.g. "169 - Title" or "#169 Title" or "169. Title" or "169 Title"
  const startMatch = str.match(/^#?(\d+)\s*[-.:]?\s*(.*)$/);
  if (startMatch) {
    const num = startMatch[1].trim();
    const title = startMatch[2].replace(/^[-.:]\s*/, '').trim();
    return { number: num, title: title, raw: str };
  }

  // Pattern 2: Title with number in parentheses e.g. "Title (169)" or "Title (#169)"
  const endMatch = str.match(/^(.*?)\s*\(#?(\d+)\)$/);
  if (endMatch) {
    return { number: endMatch[2].trim(), title: endMatch[1].trim(), raw: str };
  }

  // Pattern 3: Only number
  if (/^\d+$/.test(str)) {
    return { number: str, title: '', raw: str };
  }

  // Pattern 4: Only title
  return { number: '', title: str, raw: str };
}

/**
 * Formats hymn for presentation
 */
export function formatHymnDisplay(number?: string | number, title?: string): string {
  const numStr = number ? String(number).trim() : '';
  const titleStr = title ? String(title).trim() : '';
  if (numStr && titleStr) return `#${numStr} — ${titleStr}`;
  if (numStr) return `Hymn #${numStr}`;
  return titleStr;
}

/**
 * Formats a person's name with LDS honorifics (Brother/Sister/Elder/President/Bishop)
 * If no honorific is present, it looks up gender from the member list or gender field.
 */
export function formatPersonWithTitle(
  name: string,
  gender?: 'M' | 'F' | '',
  existingPrefix?: string
): string {
  if (!name) return '';
  const trimmed = name.trim();
  
  // Check if name already starts with a common title
  if (/^(Brother|Bro\.|Sister|Sis\.|Elder|President|Pres\.|Bishop|Bp\.|Sister |Brother )/i.test(trimmed)) {
    return trimmed;
  }

  if (existingPrefix && existingPrefix.trim()) {
    return `${existingPrefix.trim()} ${trimmed}`;
  }

  if (gender === 'M') return `Brother ${trimmed}`;
  if (gender === 'F') return `Sister ${trimmed}`;
  return trimmed;
}

/**
 * Lightweight QR Code generator data URL for Stand Agenda
 */
export function getStandQRCodeUrl(url: string): string {
  return `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=200&margin=1&format=png`;
}

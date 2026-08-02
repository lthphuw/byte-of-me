/**
 * Configuration options for the shortenName utility.
 */
export interface ShortenNameOptions {
  /**
   * The variation of the shortened name:
   * - 'initials': First letter of the first and last word (e.g., "John Doe" -> "JD").
   * - 'compact': Primary name + Initial of the secondary name.
   * - 'truncate': Truncates the string and appends an ellipsis.
   */
  variant?: 'initials' | 'compact' | 'truncate';

  /**
   * Determines the structural order of the name to handle 'compact' logic correctly:
   * - 'last-first': Asian style (e.g., "Luong Thanh Hoang Phu" -> Last: Luong, First: Phu).
   * - 'first-last': Western style (e.g., "John William Doe" -> First: John, Last: Doe).
   * Defaults to 'last-first'.
   */
  nameOrder?: 'first-last' | 'last-first';

  /** Maximum allowed length when using the 'truncate' variant (Default: 15). */
  maxLength?: number;

  /** Fallback string returned when the input name is invalid or empty (Default: ''). */
  fallback?: string;
}

/**
 * Safely shortens a given name based on the provided configuration options.
 * Handles extensive edge cases including Unicode, extra spaces, and missing data.
 * 
 * @param name - The full name string to be shortened.
 * @param options - Configuration options.
 * @returns The shortened name string.
 */
export const shortenName = (name?: string | null, options: ShortenNameOptions = {}): string => {
  const {
    variant = 'initials',
    nameOrder = 'last-first',
    maxLength = 15,
    fallback = ''
  } = options;

  // Edge Case 1: Falsy values, null, undefined, or incorrect types
  if (!name || typeof name !== 'string') return fallback;

  // Edge Case 2: Redundant whitespaces, tabs, or strings containing only spaces
  const cleanName = name.trim().replace(/\s+/g, ' ');
  if (!cleanName) return fallback;

  const parts = cleanName.split(' ');

  switch (variant) {
    case 'initials': {
      // Edge Case 3: Single word name -> Take up to the first 2 characters
      // Note: Using Array.from() prevents surrogate pair issues with Unicode/Emojis
      if (parts.length === 1) {
        return Array.from(parts[0]).slice(0, 2).join('').toUpperCase();
      }
      
      const firstInitial = Array.from(parts[0])[0];
      const lastInitial = Array.from(parts[parts.length - 1])[0];
      return `${firstInitial}${lastInitial}`.toUpperCase();
    }

    case 'compact': {
      // Edge Case 4: Single word name -> Return as is
      if (parts.length === 1) return parts[0];

      if (nameOrder === 'last-first') {
        // Asian style output: "Phu L."
        const lastNameInitial = Array.from(parts[0])[0].toUpperCase();
        const firstName = parts[parts.length - 1];
        return `${firstName} ${lastNameInitial}.`;
      } else {
        // Western style output: "John D."
        const firstName = parts[0];
        const lastNameInitial = Array.from(parts[parts.length - 1])[0].toUpperCase();
        return `${firstName} ${lastNameInitial}.`;
      }
    }

    case 'truncate': {
      // Edge Case 5: If the name is shorter than maxLength -> Return as is
      if (cleanName.length <= maxLength) return cleanName;
      return `${cleanName.slice(0, maxLength).trim()}...`;
    }

    default:
      return cleanName;
  }
};
// lib/validateEmail.ts

const KNOWN_PROVIDERS: Record<string, string> = {
  gmail: "gmail.com",
  googlemail: "gmail.com",
  outlook: "outlook.com",
  hotmail: "hotmail.com",
  live: "live.com",
  yahoo: "yahoo.com",
  icloud: "icloud.com",
  msn: "msn.com",
  aol: "aol.com",
};

// simple Levenshtein distance
function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

export interface EmailCheckResult {
  valid: boolean;
  error?: string;
  suggestion?: string; // corrected email, if we're confident
}

/**
 * Checks basic shape + flags likely typos on well-known providers.
 * Unknown domains (custom domains, temp-mail services, etc.) are
 * left alone beyond basic shape validation.
 */
export function checkEmail(email: string): EmailCheckResult {
  const trimmed = email.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { valid: false, error: "Enter a valid email address" };
  }

  const [localPart, domain] = trimmed.split("@");
  const domainLower = domain.toLowerCase();

  // domain must look like name.tld with a plausible tld (2-24 letters)
  const domainMatch = domainLower.match(/^([a-z0-9-]+)\.([a-z.]{2,24})$/);
  if (!domainMatch) {
    return { valid: false, error: "Enter a valid email domain" };
  }

  const [, domainName, tld] = domainMatch;

  // only scrutinize domains that are close to a known provider name
  const providerKey = Object.keys(KNOWN_PROVIDERS).find(
    (p) => levenshtein(domainName, p) <= 1,
  );

  if (providerKey) {
    const canonical = KNOWN_PROVIDERS[providerKey];
    const fullDomainGuess = `${domainName}.${tld}`;

    if (fullDomainGuess !== canonical) {
      // e.g. gmail.comom, gmail.con, gmail.cmo, gmail.co, outlook.con
      return {
        valid: false,
        error: `Did you mean ${localPart}@${canonical}?`,
        suggestion: `${localPart}@${canonical}`,
      };
    }
  }

  // Anything else (custom domains, temp mail, work email, etc.) passes.
  return { valid: true };
}

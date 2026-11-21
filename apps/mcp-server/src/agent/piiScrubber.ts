/**
 * PII scrubber for text that leaves the system towards an LLM provider (FR-14, NFR-05, AC-04.7).
 *
 * Pure, in-memory, regex based. Applied to the user message and to every tool result BEFORE they are
 * placed in a provider request. `assertNoPii` is the fail-closed second check run on the final
 * serialized request: if anything sensitive survived, the request is never sent.
 */

export interface PiiContext {
  /** Verified student number of the caller (from the gateway-verified identity). */
  studentId?: string;
  /** Display name / e-mail of the caller when known; matched case-insensitively. */
  name?: string;
  email?: string;
  /** Any other literal strings that must never reach the provider. */
  extraTerms?: readonly string[];
}

export const PII_PLACEHOLDERS = {
  token: '[TOKEN]',
  email: '[EMAIL]',
  studentId: '[STUDENT_ID]',
  name: '[NAME]',
} as const;

const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi;
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
/** University student numbers in this project look like 241101065. */
const STUDENT_NUMBER_PATTERN = /\b24\d{7}\b/g;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function literalTerms(context: PiiContext): Array<{ term: string; placeholder: string }> {
  const entries: Array<{ term: string | undefined; placeholder: string }> = [
    { term: context.studentId, placeholder: PII_PLACEHOLDERS.studentId },
    { term: context.email, placeholder: PII_PLACEHOLDERS.email },
    { term: context.name, placeholder: PII_PLACEHOLDERS.name },
    ...(context.extraTerms ?? []).map((term) => ({ term, placeholder: PII_PLACEHOLDERS.name })),
  ];
  return entries
    .filter((entry): entry is { term: string; placeholder: string } => {
      return typeof entry.term === 'string' && entry.term.trim().length >= 3;
    })
    .map((entry) => ({ term: entry.term.trim(), placeholder: entry.placeholder }))
    // Longest first so "Test Student" is replaced before "Test".
    .sort((a, b) => b.term.length - a.term.length);
}

/** Replaces tokens, e-mails, student numbers and the caller's known identifiers in free text. */
export function scrubPii(text: string, context: PiiContext = {}): string {
  let result = text
    .replace(BEARER_PATTERN, `Bearer ${PII_PLACEHOLDERS.token}`)
    .replace(JWT_PATTERN, PII_PLACEHOLDERS.token)
    .replace(EMAIL_PATTERN, PII_PLACEHOLDERS.email)
    .replace(STUDENT_NUMBER_PATTERN, PII_PLACEHOLDERS.studentId);
  for (const { term, placeholder } of literalTerms(context)) {
    result = result.replace(new RegExp(escapeRegExp(term), 'gi'), placeholder);
  }
  return result;
}

/** Scrubs every string inside a JSON-like value (object keys are kept as they are). */
export function scrubDeep<T>(value: T, context: PiiContext = {}): T {
  if (typeof value === 'string') {
    return scrubPii(value, context) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => scrubDeep(item, context)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = scrubDeep(item, context);
    }
    return out as T;
  }
  return value;
}

export class PiiLeakError extends Error {
  constructor(public readonly kinds: readonly string[]) {
    super(`Refusing to send request to LLM provider: unredacted ${kinds.join(', ')} found.`);
    this.name = 'PiiLeakError';
  }
}

/** Lists what is still detectable in `text` (empty when clean). Never returns the matched values. */
export function detectPii(text: string, context: PiiContext = {}): string[] {
  const kinds: string[] = [];
  const check = (pattern: RegExp, kind: string) => {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      kinds.push(kind);
    }
    pattern.lastIndex = 0;
  };
  check(JWT_PATTERN, 'token');
  check(BEARER_PATTERN, 'bearer token');
  check(EMAIL_PATTERN, 'e-mail address');
  check(STUDENT_NUMBER_PATTERN, 'student number');
  for (const { term, placeholder } of literalTerms(context)) {
    if (new RegExp(escapeRegExp(term), 'i').test(text)) {
      kinds.push(placeholder.replace(/[[\]]/g, '').toLowerCase());
    }
  }
  return [...new Set(kinds)];
}

/** Fail-closed guard for the serialized provider request. */
export function assertNoPii(serializedRequest: string, context: PiiContext = {}): void {
  const kinds = detectPii(serializedRequest, context);
  if (kinds.length > 0) {
    throw new PiiLeakError(kinds);
  }
}

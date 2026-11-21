import { describe, expect, it } from 'vitest';
import {
  assertNoPii,
  detectPii,
  PiiLeakError,
  scrubDeep,
  scrubPii,
} from '../../apps/mcp-server/src/agent/piiScrubber.js';

const JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyNDExMDEwNjUiLCJuYW1lIjoiVGVzdCJ9.c2lnbmF0dXJlLXZhbHVl';
const ctx = { studentId: '241101065', name: 'Test Student', email: 'test@example.edu' };

describe('scrubPii (FR-14, AC-04.7)', () => {
  it('removes a raw JWT and a Bearer header', () => {
    const out = scrubPii(`token ${JWT} and Authorization: Bearer ${JWT}`, ctx);
    expect(out).not.toContain('eyJ');
    expect(out).toContain('[TOKEN]');
  });

  it('removes the caller student number, name and e-mail, case-insensitively', () => {
    const out = scrubPii('Ben TEST student, no 241101065, mail Test@Example.edu', ctx);
    expect(out).not.toMatch(/241101065|test student|example\.edu/i);
    expect(out).toContain('[STUDENT_ID]');
    expect(out).toContain('[NAME]');
    expect(out).toContain('[EMAIL]');
  });

  it('removes other student numbers and e-mail addresses without context', () => {
    expect(scrubPii('öğrenci 241101013 ve a.b@uni.edu.tr')).toBe('öğrenci [STUDENT_ID] ve [EMAIL]');
  });

  it('keeps ordinary campus text and times untouched', () => {
    const text = '10:30 dersimden sonra ringe yetişir miyim, bugün yemekte ne var? BIL 481 TM-213';
    expect(scrubPii(text, ctx)).toBe(text);
  });

  it('ignores too-short context terms instead of mangling the text', () => {
    expect(scrubPii('ab ab ab', { name: 'ab' })).toBe('ab ab ab');
  });

  it('handles regex metacharacters in context terms', () => {
    expect(scrubPii('who is (a+b)?', { extraTerms: ['(a+b)?'] })).toBe('who is [NAME]');
  });
});

describe('scrubDeep', () => {
  it('scrubs strings inside nested JSON and leaves other types alone', () => {
    const input = { rows: [{ owner: '241101065', n: 3, ok: true, none: null, mail: 'x@y.edu' }] };
    expect(scrubDeep(input, ctx)).toEqual({
      rows: [{ owner: '[STUDENT_ID]', n: 3, ok: true, none: null, mail: '[EMAIL]' }],
    });
    expect(input.rows[0]!.owner).toBe('241101065'); // input is not mutated
  });
});

describe('assertNoPii (fail closed)', () => {
  it('passes on a clean payload', () => {
    expect(() => assertNoPii('{"q":"yemekte ne var?"}', ctx)).not.toThrow();
  });

  it('throws PiiLeakError naming the kinds but never the values', () => {
    let error: unknown;
    try {
      assertNoPii(`{"q":"${JWT}","id":"241101065"}`, ctx);
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(PiiLeakError);
    const message = (error as Error).message;
    expect(message).toContain('token');
    expect(message).toContain('student number');
    expect(message).not.toContain('241101065');
    expect(message).not.toContain('eyJ');
  });

  it('detectPii is repeatable (no stale regex state)', () => {
    expect(detectPii('241101065', ctx)).toContain('student number');
    expect(detectPii('241101065', ctx)).toContain('student number');
    expect(detectPii('temiz', ctx)).toEqual([]);
  });
});

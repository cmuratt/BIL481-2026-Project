import { TOOL_NAMES } from '@campus-orchestrator/shared';
import type {
  LlmFunctionCall,
  LlmFunctionResult,
  LlmProvider,
  LlmRequest,
  LlmResponse,
} from './LlmProvider.js';

/**
 * Deterministic provider for unit/integration tests and offline demos.
 *
 * It is NOT an LLM. Any run that used it must be reported as "fake provider" and can never count
 * as the real UC-04 acceptance run (API Contract §3.3, AC-04.11). `isFake` is written to the
 * outbound log for that reason.
 */
export type FakeScript = (request: LlmRequest, callIndex: number) => LlmResponse | Promise<LlmResponse>;

function lastText(request: LlmRequest): string {
  for (let i = request.turns.length - 1; i >= 0; i -= 1) {
    const turn = request.turns[i]!;
    if (turn.role === 'user') {
      return turn.text;
    }
  }
  return '';
}

/** Keyword routing that mimics the model deciding which tools a question needs. */
function planCalls(question: string): LlmFunctionCall[] {
  const q = question.toLocaleLowerCase('tr-TR');
  const calls: LlmFunctionCall[] = [];
  if (/\bders|schedule|class|course|program/.test(q)) {
    calls.push({ name: TOOL_NAMES.COURSE_SCHEDULE, args: {} });
  }
  if (/ring|servis|shuttle|otobüs|yetiş/.test(q)) {
    calls.push({ name: TOOL_NAMES.SHUTTLE_SCHEDULE, args: {} });
  }
  if (/yemek|menü|menu|lunch|dinner|öğle|akşam/.test(q)) {
    calls.push({ name: TOOL_NAMES.CAFETERIA_MENU, args: {} });
  }
  if (/kütüphane|library|doluluk|occupancy/.test(q)) {
    calls.push({ name: TOOL_NAMES.LIBRARY_OCCUPANCY, args: {} });
  }
  return calls;
}

function resultsOf(request: LlmRequest): LlmFunctionResult[] {
  return request.turns.flatMap((turn) => (turn.role === 'tool' ? turn.results : []));
}

function describeResult(result: LlmFunctionResult): string {
  const payload = result.response as { error?: string; data?: any; isSimulated?: boolean };
  if (payload?.error) {
    return `${result.name}: hata (${payload.error})`;
  }
  const data = payload?.data;
  const synthetic = payload?.isSimulated ? ' (sentetik veri)' : '';
  if (result.name === TOOL_NAMES.COURSE_SCHEDULE && Array.isArray(data)) {
    const ends = data.map((c: any) => `${c.courseCode} ${c.startTime}-${c.endTime}`).join(', ');
    return `Dersler: ${ends || 'ders yok'}${synthetic}`;
  }
  if (result.name === TOOL_NAMES.SHUTTLE_SCHEDULE) {
    const next = Array.isArray(data?.nextDepartures) ? data.nextDepartures.join(', ') : 'bilgi yok';
    return `Sıradaki ring seferleri: ${next}${synthetic}`;
  }
  if (result.name === TOOL_NAMES.CAFETERIA_MENU) {
    if (data?.available === false) {
      return `Yemekhane kapalı: ${data.unavailableReason ?? 'menü yok'}${synthetic}`;
    }
    return `Öğle yemeği: ${data?.lunch?.mainDish ?? 'bilgi yok'}${synthetic}`;
  }
  if (result.name === TOOL_NAMES.LIBRARY_OCCUPANCY) {
    return `Kütüphane doluluğu: ${data?.totalOccupied ?? '?'}/${data?.totalCapacity ?? '?'}${synthetic}`;
  }
  return `${result.name}: tamam${synthetic}`;
}

export class FakeProvider implements LlmProvider {
  public readonly name = 'fake';
  public readonly isFake = true;
  public readonly requests: LlmRequest[] = [];

  constructor(private readonly script?: FakeScript) {}

  public async generate(request: LlmRequest): Promise<LlmResponse> {
    const index = this.requests.length;
    this.requests.push(request);
    if (this.script) {
      return this.script(request, index);
    }

    const results = resultsOf(request);
    if (results.length === 0 && request.tools.length > 0) {
      const calls = planCalls(lastText(request));
      if (calls.length > 0) {
        return { functionCalls: calls };
      }
      return { functionCalls: [], text: 'Bu soru için kampüs verisi gerekmiyor gibi görünüyor.' };
    }
    return { functionCalls: [], text: results.map(describeResult).join('. ') + '.' };
  }
}

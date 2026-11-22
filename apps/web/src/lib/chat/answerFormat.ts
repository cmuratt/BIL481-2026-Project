/**
 * Turns the assistant's answer text into simple blocks for display.
 *
 * The model (Gemini) often answers in light Markdown: `**bold**`, `*italic*`,
 * bullet lists (`* `, `- `, `• `), numbered lists (`1. `) and headings (`## `).
 * Showing those marks raw looks broken, so this module recognises only that
 * small subset. The result is plain data that the component renders as React
 * elements; no HTML from the model is ever interpreted, so the answer cannot
 * inject markup or links.
 *
 * The parser is tolerant of streaming: an unclosed `**` (the rest has not
 * arrived yet) is shown as literal text until the closing mark comes.
 */

export interface InlineSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export type AnswerBlock =
  | { type: 'paragraph'; lines: InlineSpan[][] }
  | { type: 'heading'; spans: InlineSpan[] }
  | { type: 'list'; ordered: boolean; items: InlineSpan[][] };

const BULLET = /^\s*[*\-•]\s+(.*)$/;
const NUMBERED = /^\s*\d{1,3}[.)]\s+(.*)$/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;

/** Splits one line into bold / italic / plain spans. Unmatched marks stay literal. */
export function parseInline(line: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  const pattern = /\*\*(?=\S)(.+?)(?<=\S)\*\*|\*(?=[^\s*])([^*]+?)(?<=[^\s*])\*/g;
  let last = 0;
  for (const match of line.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) {
      spans.push({ text: line.slice(last, index) });
    }
    if (match[1] !== undefined) {
      spans.push({ text: match[1], bold: true });
    } else {
      spans.push({ text: match[2]!, italic: true });
    }
    last = index + match[0].length;
  }
  if (last < line.length) {
    spans.push({ text: line.slice(last) });
  }
  return spans;
}

/** Groups the answer into paragraphs, headings and lists. */
export function parseAnswer(text: string): AnswerBlock[] {
  const blocks: AnswerBlock[] = [];
  let paragraph: InlineSpan[][] | null = null;
  let list: { ordered: boolean; items: InlineSpan[][] } | null = null;

  const flush = () => {
    if (paragraph) {
      blocks.push({ type: 'paragraph', lines: paragraph });
      paragraph = null;
    }
    if (list) {
      blocks.push({ type: 'list', ordered: list.ordered, items: list.items });
      list = null;
    }
  };

  for (const rawLine of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (rawLine.trim() === '') {
      flush();
      continue;
    }

    const heading = HEADING.exec(rawLine);
    const bullet = heading ? null : BULLET.exec(rawLine);
    const numbered = heading || bullet ? null : NUMBERED.exec(rawLine);

    if (heading) {
      flush();
      blocks.push({ type: 'heading', spans: parseInline(heading[1]!.trim()) });
    } else if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (paragraph || (list && list.ordered !== ordered)) {
        flush();
      }
      list ??= { ordered, items: [] };
      list.items.push(parseInline((bullet ?? numbered)![1]!.trim()));
    } else {
      if (list) {
        flush();
      }
      paragraph ??= [];
      paragraph.push(parseInline(rawLine.trim()));
    }
  }
  flush();
  return blocks;
}

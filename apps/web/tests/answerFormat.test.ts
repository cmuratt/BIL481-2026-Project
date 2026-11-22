import { describe, expect, it } from 'vitest';
import { parseAnswer, parseInline } from '../src/lib/chat/answerFormat';

/** Light Markdown in assistant answers (AT-04 step 4: the answer must read cleanly). */

describe('parseInline', () => {
  it('turns **bold** and *italic* into spans', () => {
    expect(parseInline('Ders **12:20** bitiyor, *sentetik*.')).toEqual([
      { text: 'Ders ' },
      { text: '12:20', bold: true },
      { text: ' bitiyor, ' },
      { text: 'sentetik', italic: true },
      { text: '.' },
    ]);
  });

  it('keeps an unclosed mark literal while the answer is still streaming', () => {
    expect(parseInline('Sefer **12:3')).toEqual([{ text: 'Sefer **12:3' }]);
  });

  it('does not treat a lone asterisk or arithmetic as emphasis', () => {
    expect(parseInline('2 * 3 = 6')).toEqual([{ text: '2 * 3 = 6' }]);
  });

  it('keeps markup-looking text as plain text (never interpreted as HTML)', () => {
    expect(parseInline('<img src=x onerror=alert(1)> **ok**')).toEqual([
      { text: '<img src=x onerror=alert(1)> ' },
      { text: 'ok', bold: true },
    ]);
  });
});

describe('parseAnswer', () => {
  it('reproduces the AT-04 answer layout: paragraphs and a bullet list', () => {
    const text = [
      '*Not: Sunulan veriler sentetiktir.*',
      '',
      'Dersin **10:30 - 12:20** arasında.',
      'Sonraki ring: **12:30**.',
      '',
      'Bugünkü yemekhane menüsü:',
      '* **Öğle Yemeği (950 kcal):** Tarhana Çorbası, Tavuk Sote',
      '* **Akşam Yemeği:** Mercimek Çorbası',
    ].join('\n');

    const blocks = parseAnswer(text);

    expect(blocks.map((block) => block.type)).toEqual(['paragraph', 'paragraph', 'paragraph', 'list']);
    expect(blocks[0]).toEqual({ type: 'paragraph', lines: [[{ text: 'Not: Sunulan veriler sentetiktir.', italic: true }]] });
    expect(blocks[1]).toMatchObject({ type: 'paragraph', lines: [expect.any(Array), expect.any(Array)] });
    expect(blocks[3]).toEqual({
      type: 'list',
      ordered: false,
      items: [
        [{ text: 'Öğle Yemeği (950 kcal):', bold: true }, { text: ' Tarhana Çorbası, Tavuk Sote' }],
        [{ text: 'Akşam Yemeği:', bold: true }, { text: ' Mercimek Çorbası' }],
      ],
    });
  });

  it('recognises numbered lists, "-" bullets and headings', () => {
    const blocks = parseAnswer('## Özet\n1. Ders\n2. Ring\n- Menü');

    expect(blocks).toEqual([
      { type: 'heading', spans: [{ text: 'Özet' }] },
      { type: 'list', ordered: true, items: [[{ text: 'Ders' }], [{ text: 'Ring' }]] },
      { type: 'list', ordered: false, items: [[{ text: 'Menü' }]] },
    ]);
  });

  it('returns plain text unchanged as one paragraph', () => {
    expect(parseAnswer('Merhaba')).toEqual([{ type: 'paragraph', lines: [[{ text: 'Merhaba' }]] }]);
  });
});

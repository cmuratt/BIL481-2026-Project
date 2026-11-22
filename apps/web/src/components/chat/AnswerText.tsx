import { parseAnswer, type InlineSpan } from '@/lib/chat/answerFormat';
import styles from './chat.module.css';

function Spans({ spans }: { spans: InlineSpan[] }) {
  return (
    <>
      {spans.map((span, index) =>
        span.bold ? (
          <strong key={index}>{span.text}</strong>
        ) : span.italic ? (
          <em key={index}>{span.text}</em>
        ) : (
          <span key={index}>{span.text}</span>
        )
      )}
    </>
  );
}

/**
 * The assistant's answer with light formatting (bold, italic, lists, headings).
 * Everything is rendered as React text nodes; model output is never treated as HTML.
 */
export function AnswerText({ text }: { text: string }) {
  const blocks = parseAnswer(text);

  return (
    <div className={styles.answerText}>
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <p key={index} className={styles.answerHeading}>
              <Spans spans={block.spans} />
            </p>
          );
        }
        if (block.type === 'list') {
          const List = block.ordered ? 'ol' : 'ul';
          return (
            <List key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <Spans spans={item} />
                </li>
              ))}
            </List>
          );
        }
        return (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 && <br />}
                <Spans spans={line} />
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

import { Children, type ReactNode } from 'react';
import { resolveCodeGroupIcon } from '@/lib/code-group-icons';
import { T } from '@/components/T';

interface CodeGroupProps {
  'data-labels'?: string;
  'data-group-id'?: string;
  children?: ReactNode;
}

/**
 * Tabbed code group widget. CSS-only — the radio + label sibling trick handles
 * tab switching with zero JavaScript. Accessibility is the native radio
 * group's: the radios share a `name`, so only the checked one is a Tab stop,
 * arrow keys move between them, and each radio is named by its <label>. (No
 * tab/tablist roles — the labels aren't focusable, so they'd promise a
 * keyboard model the widget doesn't have.) The matching CSS in globals.css picks the
 * checked input's matching panel via attribute selectors (input[data-idx=N] →
 * .cg-panel[data-panel=N]).
 *
 * Children are already-highlighted CodeBlock server components from the
 * outer MarkdownRenderer pipeline; this component just composes the tab UI
 * around them.
 */
export default function CodeGroup(props: CodeGroupProps) {
  const labelsRaw = props['data-labels'] ?? '[]';
  const groupId = props['data-group-id'] ?? 'cg-default';
  let labels: string[];
  try {
    const parsed = JSON.parse(labelsRaw);
    labels = Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    labels = [];
  }

  // Drop whitespace text nodes that remark-rehype leaves between code children.
  const panels = Children.toArray(props.children).filter((child) => {
    if (typeof child === 'string') return child.trim().length > 0;
    return true;
  });
  // Unlabeled groups fall back to a translated "Tab N".
  const tabs: (string | null)[] = labels.length > 0 ? labels : panels.map(() => null);

  return (
    <div className="code-group my-6" data-group-id={groupId}>
      {tabs.map((_, i) => (
        <input
          key={`r-${i}`}
          type="radio"
          name={`cg-${groupId}`}
          id={`cg-${groupId}-${i}`}
          data-idx={String(i)}
          defaultChecked={i === 0}
          aria-controls={`cg-${groupId}-panel-${i}`}
        />
      ))}
      <div className="cg-tablist">
        {tabs.map((label, i) => {
          const icon = label ? resolveCodeGroupIcon(label) : null;
          return (
            <label
              key={`l-${i}`}
              htmlFor={`cg-${groupId}-${i}`}
              className="cg-tab"
              {...(icon ? { 'data-cg-icon': icon } : {})}
            >
              {label ?? <T k="code_tab_fallback" params={{ n: i + 1 }} />}
            </label>
          );
        })}
      </div>
      {panels.map((child, i) => (
        <div
          key={`p-${i}`}
          className="cg-panel"
          data-panel={String(i)}
          id={`cg-${groupId}-panel-${i}`}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

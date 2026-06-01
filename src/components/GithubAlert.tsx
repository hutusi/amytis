import type { ReactNode } from 'react';

type AlertType = 'note' | 'tip' | 'important' | 'warning' | 'caution';

const KNOWN_TYPES: ReadonlySet<AlertType> = new Set(['note', 'tip', 'important', 'warning', 'caution']);

const ALERT_LABELS: Record<AlertType, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
};

interface GithubAlertProps {
  'data-alert-type'?: string;
  /** Custom title from the directive label (e.g. `:::tip 智慧的疆界`). Falls back to ALERT_LABELS when absent. */
  'data-alert-title'?: string;
  children?: ReactNode;
}

function AlertIcon({ type }: { type: AlertType }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (type) {
    case 'note':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      );
    case 'tip':
      return (
        <svg {...common}>
          <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
          <path d="M9 18h6" />
          <path d="M10 22h4" />
        </svg>
      );
    case 'important':
      return (
        <svg {...common}>
          <path d="M21 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      );
    case 'warning':
      return (
        <svg {...common}>
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );
    case 'caution':
      return (
        <svg {...common}>
          <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      );
  }
}

export default function GithubAlert(props: GithubAlertProps) {
  const raw = (props['data-alert-type'] ?? '').toLowerCase();
  if (!KNOWN_TYPES.has(raw as AlertType)) {
    // Defensive: an unrecognized type means the plugin matched but we're missing
    // a mapping. Fall through to a plain blockquote so content still renders.
    return <blockquote>{props.children}</blockquote>;
  }
  const type = raw as AlertType;
  const customTitle = props['data-alert-title']?.trim();
  const title = customTitle && customTitle.length > 0 ? customTitle : ALERT_LABELS[type];
  return (
    <aside className={`alert alert-${type}`} role="note" aria-label={title}>
      <div className="alert-title">
        <AlertIcon type={type} />
        <span>{title}</span>
      </div>
      <div className="alert-body">{props.children}</div>
    </aside>
  );
}

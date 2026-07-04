'use client';

import { Fragment, useId, useRef, useState } from 'react';
import Link from 'next/link';

export interface NavMenuItem {
  key: string;
  href: string;
  label: string;
  external?: boolean;
  dividerBefore?: boolean;
}

interface NavDropdownProps {
  label: string;
  /** When set, the label is a navigating link and the chevron becomes a
   *  separate disclosure button; without it the whole trigger is the button. */
  href?: string;
  active: boolean;
  items: NavMenuItem[];
  footer?: { href: string; label: string };
  /** Localized aria-labels for the disclosure toggle. */
  expandLabel: string;
  collapseLabel: string;
  align?: 'left' | 'right';
  panelClassName?: string;
}

const TRIGGER_CLASS = (active: boolean) =>
  `text-sm font-sans font-medium no-underline transition-colors duration-200 flex items-center gap-1 py-4 ${
    active ? 'text-accent' : 'text-foreground/80 hover:text-heading'
  }`;

/**
 * Desktop nav dropdown following the WAI-ARIA disclosure-navigation pattern.
 * Hover reveal is kept as a mouse convenience (group-hover), but the panel is
 * genuinely controlled by the disclosure button: click/Enter/Space toggles it
 * (aria-expanded + aria-controls), Escape closes and returns focus to the
 * toggle, and focus leaving the whole dropdown closes it. Keyboard and touch
 * users were previously locked out — the panel was hover-only.
 */
export default function NavDropdown({
  label,
  href,
  active,
  items,
  footer,
  expandLabel,
  collapseLabel,
  align = 'left',
  panelClassName = 'min-w-[200px]',
}: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  function handleBlur(event: React.FocusEvent<HTMLDivElement>) {
    if (!wrapperRef.current?.contains(event.relatedTarget as Node)) {
      setOpen(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape' && open) {
      event.stopPropagation();
      setOpen(false);
      toggleRef.current?.focus();
    }
  }

  const chevron = (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`opacity-50 transition-transform ${open ? 'rotate-180' : 'group-hover:rotate-180'}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );

  const toggleProps = {
    ref: toggleRef,
    'aria-expanded': open,
    'aria-controls': panelId,
    onClick: () => setOpen((o) => !o),
  } as const;

  return (
    <div
      ref={wrapperRef}
      className="relative group"
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      {href ? (
        <div className="flex items-center">
          <Link href={href} className={TRIGGER_CLASS(active)}>
            {label}
          </Link>
          <button
            type="button"
            {...toggleProps}
            aria-label={open ? collapseLabel : expandLabel}
            className="py-4 pl-1 bg-transparent border-0 cursor-pointer text-foreground/80 hover:text-heading"
          >
            {chevron}
          </button>
        </div>
      ) : (
        <button
          type="button"
          {...toggleProps}
          className={`${TRIGGER_CLASS(active)} bg-transparent border-0 cursor-pointer`}
        >
          {label}
          {chevron}
        </button>
      )}

      <div
        id={panelId}
        className={`absolute top-full ${align === 'right' ? 'right-0' : 'left-0'} pt-2 transition-all duration-200 ${panelClassName} ${
          open
            ? 'opacity-100 visible'
            : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'
        }`}
      >
        <div className="dropdown-panel p-2 flex flex-col gap-1 animate-slide-down">
          {items.map((item, index) => {
            const ItemComp = item.external ? 'a' : Link;
            const itemProps = item.external
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {};
            return (
              <Fragment key={item.key}>
                {item.dividerBefore && index > 0 && <div className="h-px bg-surface-soft my-1" />}
                <ItemComp
                  href={item.href}
                  {...itemProps}
                  className="dropdown-item"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </ItemComp>
              </Fragment>
            );
          })}
          {footer && (
            <>
              <div className="h-px bg-surface-soft my-1"></div>
              <Link href={footer.href} className="dropdown-item-footer" onClick={() => setOpen(false)}>
                {footer.label}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

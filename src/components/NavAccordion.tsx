'use client';

import { Fragment, useId } from 'react';
import Link from 'next/link';
import type { NavMenuItem } from './NavDropdown';

interface NavAccordionProps {
  label: string;
  /** When set, the label navigates and a separate chevron button toggles;
   *  without it the whole row is the toggle button. */
  href?: string;
  active: boolean;
  items: NavMenuItem[];
  footer?: { href: string; label: string };
  isOpen: boolean;
  onToggle: () => void;
  /** Called when a navigation happens so the parent can close the menu. */
  onNavigate: () => void;
  /** Localized aria-labels for the toggle. */
  expandLabel: string;
  collapseLabel: string;
}

/** Mobile nav accordion — the collapsible counterpart of NavDropdown. */
export default function NavAccordion({
  label,
  href,
  active,
  items,
  footer,
  isOpen,
  onToggle,
  onNavigate,
  expandLabel,
  collapseLabel,
}: NavAccordionProps) {
  const panelId = useId();

  const chevron = (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );

  return (
    <div>
      {href ? (
        <div
          className={`flex items-center rounded-lg transition-colors ${
            active ? 'text-accent' : 'text-foreground/80'
          }`}
        >
          <Link
            href={href}
            className="flex-1 px-3 py-3 text-base font-sans font-medium no-underline hover:text-accent transition-colors"
            onClick={onNavigate}
          >
            {label}
          </Link>
          <button
            className="px-3 py-3 text-foreground/60 hover:text-accent transition-colors"
            onClick={onToggle}
            aria-label={isOpen ? collapseLabel : expandLabel}
            aria-expanded={isOpen}
            aria-controls={panelId}
          >
            {chevron}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={`w-full flex items-center justify-between px-3 py-3 text-base font-sans font-medium rounded-lg transition-colors ${
            active ? 'text-accent' : 'text-foreground/80 hover:text-accent hover:bg-surface-soft'
          }`}
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
        >
          {label}
          {chevron}
        </button>
      )}
      {isOpen && (
        <div id={panelId} className="ml-4 pl-3 border-l-2 border-line flex flex-col gap-1 mb-1">
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
                  className="nav-accordion-item"
                  onClick={onNavigate}
                >
                  {item.label}
                </ItemComp>
              </Fragment>
            );
          })}
          {footer && (
            <Link href={footer.href} className="nav-accordion-footer" onClick={onNavigate}>
              {footer.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import NavDropdown, { type NavMenuItem } from '@/components/NavDropdown';

// Keyboard/touch accessibility of the desktop nav dropdown (WAI-ARIA
// disclosure pattern). The pre-refactor dropdowns were hover-only: no
// aria-expanded, no way to open them without a mouse.

const ITEMS: NavMenuItem[] = [
  { key: 'a', href: '/books/a', label: 'Book A' },
  { key: 'b', href: '/books/b', label: 'Book B' },
];

function renderLinkTrigger() {
  return render(
    <NavDropdown
      label="Books"
      href="/books"
      active={false}
      items={ITEMS}
      footer={{ href: '/books', label: 'All books →' }}
      expandLabel="Expand Books"
      collapseLabel="Collapse Books"
    />
  );
}

function getPanel(toggle: HTMLElement): HTMLElement {
  const id = toggle.getAttribute('aria-controls');
  expect(id).toBeTruthy();
  const panel = document.getElementById(id!);
  expect(panel).not.toBeNull();
  return panel!;
}

describe('NavDropdown (link trigger + disclosure button)', () => {
  test('panel is closed until the disclosure button is clicked', () => {
    renderLinkTrigger();
    const toggle = screen.getByRole('button', { name: 'Expand Books' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    const panel = getPanel(toggle);
    expect(panel.classList.contains('invisible')).toBe(true);

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Collapse Books');
    expect(panel.classList.contains('invisible')).toBe(false);
    expect(panel.classList.contains('visible')).toBe(true);
  });

  test('label stays a real navigation link', () => {
    renderLinkTrigger();
    const link = screen.getByRole('link', { name: 'Books' });
    expect(link.getAttribute('href')).toBe('/books');
  });

  test('Escape closes the panel and returns focus to the toggle', () => {
    renderLinkTrigger();
    const toggle = screen.getByRole('button', { name: 'Expand Books' });
    fireEvent.click(toggle);
    const panel = getPanel(toggle);

    const firstItem = screen.getByRole('link', { name: 'Book A' });
    firstItem.focus();
    fireEvent.keyDown(firstItem, { key: 'Escape' });

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(panel.classList.contains('invisible')).toBe(true);
    expect(document.activeElement).toBe(toggle);
  });

  test('clicking a panel item closes the panel', () => {
    renderLinkTrigger();
    const toggle = screen.getByRole('button', { name: 'Expand Books' });
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('link', { name: 'Book A' }));
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  test('focus leaving the dropdown closes the panel', () => {
    renderLinkTrigger();
    const toggle = screen.getByRole('button', { name: 'Expand Books' });
    fireEvent.click(toggle);
    fireEvent.blur(toggle, { relatedTarget: document.body });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('NavDropdown (button-only trigger, e.g. "More")', () => {
  test('the whole trigger is a disclosure button with state', () => {
    render(
      <NavDropdown
        label="More"
        active={false}
        items={[
          { key: '/notes', href: '/notes', label: 'Notes' },
          { key: '/graph', href: '/graph', label: 'Graph', dividerBefore: true },
        ]}
        align="right"
        expandLabel="Expand More"
        collapseLabel="Collapse More"
      />
    );
    const toggle = screen.getByRole('button', { name: 'More' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const panel = getPanel(toggle);
    expect(panel.classList.contains('visible')).toBe(true);
  });
});

/**
 * DOM ids shared by the search input (Search.tsx) and the results listbox
 * (SearchPanel.tsx): the input's combobox ARIA points at them. Kept in a
 * dependency-free module because Search.tsx must not import SearchPanel's
 * values, or the lazily loaded panel would ship with every page.
 */
export function searchListboxId(baseId: string): string {
  return `${baseId}-listbox`;
}

export function searchOptionId(baseId: string, index: number): string {
  return `${baseId}-option-${index}`;
}

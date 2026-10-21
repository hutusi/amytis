import { describe, test, expect, mock } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import ImageZoom from '@/components/ImageZoom';
import { LanguageProvider } from '@/components/LanguageProvider';
import { ImmersiveReadingProvider, useImmersiveReading } from '@/components/ImmersiveReadingProvider';

// happy-dom's <dialog> only toggles `open`: no native Escape handling, top
// layer or ::backdrop. The component handles Escape itself, so these tests
// exercise the real code path; the top layer is checked in a browser.

function renderZoom() {
  render(
    <LanguageProvider>
      <ImageZoom />
    </LanguageProvider>,
  );
  return document.querySelector<HTMLDialogElement>('dialog[data-image-zoom="true"]')!;
}

/** A content image as the renderers emit it, optionally inside a wrapper. */
function contentImage(wrapper?: string, attrs = 'data-zoomable="true"'): HTMLImageElement {
  const host = document.createElement('div');
  const img = `<img src="/images/photo-1920.webp" alt="A photo" ${attrs}>`;
  host.innerHTML = wrapper ? wrapper.replace('IMG', img) : img;
  document.body.appendChild(host);
  return host.querySelector('img')!;
}

describe('ImageZoom', () => {
  test('a click on a marked image opens it full size and locks the page', () => {
    const dialog = renderZoom();
    fireEvent.click(contentImage());

    expect(dialog.open).toBe(true);
    expect(dialog.getAttribute('aria-label')).toBe('A photo');
    expect(dialog.querySelector('img')!.getAttribute('src')).toBe('http://localhost:3000/images/photo-1920.webp');
    expect(document.documentElement.style.overflow).toBe('hidden');
  });

  test('Escape closes it without reaching window listeners, and unlocks the page', () => {
    const dialog = renderZoom();
    document.documentElement.style.overflow = 'clip';
    fireEvent.click(contentImage());
    const windowKeydown = mock(() => {});
    window.addEventListener('keydown', windowKeydown);
    try {
      fireEvent.keyDown(dialog, { key: 'Escape' });
    } finally {
      window.removeEventListener('keydown', windowKeydown);
    }

    expect(dialog.open).toBe(false);
    expect(windowKeydown).not.toHaveBeenCalled();
    expect(document.documentElement.style.overflow).toBe('clip');
    expect(dialog.querySelector('img')).toBeNull();
  });

  test('the close button and a click on the backdrop close it', () => {
    const dialog = renderZoom();
    fireEvent.click(contentImage());
    fireEvent.click(screen.getByRole('button', { name: 'Close image' }));
    expect(dialog.open).toBe(false);

    fireEvent.click(document.querySelector('img[data-zoomable]')!);
    expect(dialog.open).toBe(true);
    fireEvent.click(dialog);
    expect(dialog.open).toBe(false);
  });

  test('linked, diagram, unmarked and modified clicks are left alone', () => {
    const dialog = renderZoom();
    fireEvent.click(contentImage('<a href="/elsewhere/">IMG</a>'));
    fireEvent.click(contentImage('<div class="mermaid">IMG</div>'));
    fireEvent.click(contentImage(undefined, ''));
    fireEvent.click(contentImage(), { ctrlKey: true });
    fireEvent.click(contentImage(), { button: 1 });
    expect(dialog.open).toBe(false);
  });

  test('falls back to the image the page loaded when the full-size one fails', () => {
    const dialog = renderZoom();
    const img = contentImage();
    Object.defineProperty(img, 'currentSrc', { value: 'http://localhost:3000/images/photo.webp' });
    fireEvent.click(img);
    const zoomed = dialog.querySelector('img')!;
    fireEvent.error(zoomed);
    expect(zoomed.getAttribute('src')).toBe('http://localhost:3000/images/photo.webp');
  });

  test('Escape in the lightbox leaves the immersive reader open', () => {
    function Reader() {
      const { enabled, enter } = useImmersiveReading();
      return <button onClick={enter}>{enabled ? 'reading' : 'enter'}</button>;
    }
    render(
      <LanguageProvider>
        <ImmersiveReadingProvider>
          <Reader />
        </ImmersiveReadingProvider>
        <ImageZoom />
      </LanguageProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'enter' }));
    const dialog = document.querySelector<HTMLDialogElement>('dialog[data-image-zoom="true"]')!;
    fireEvent.click(contentImage());
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(dialog.open).toBe(false);
    expect(screen.getByRole('button', { name: 'reading' })).toBeTruthy();
  });
});

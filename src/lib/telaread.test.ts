import { describe, expect, test } from 'bun:test';
import { telareadProfileLink } from './telaread';

describe('telareadProfileLink', () => {
  test('links to the Tela profile with rel="me" when a username is set', () => {
    const link = telareadProfileLink({ telaread: { username: 'alice_92' } });
    expect(link?.href).toBe('https://telaread.com/@alice_92');
    // Tela accepts the link as proof of ownership by its `me` token.
    expect(link?.rel.split(/\s+/)).toContain('me');
  });

  test('is null for an empty username (the default)', () => {
    expect(telareadProfileLink({ telaread: { username: '' } })).toBeNull();
  });

  test('is null for a config written before the field existed', () => {
    expect(telareadProfileLink({})).toBeNull();
  });
});

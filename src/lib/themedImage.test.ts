import { describe, it, expect } from 'vitest';
import { resolveThemedImage } from './themedImage';

describe('themedImage — resolveThemedImage', () => {
  it('returns placeholder when undefined', () => {
    expect(resolveThemedImage(undefined, 'dark', 'ph.png')).toBe('ph.png');
    expect(resolveThemedImage(undefined, 'dark')).toBe('');
  });
  it('a plain string serves both themes', () => {
    expect(resolveThemedImage('logo.png', 'dark')).toBe('logo.png');
    expect(resolveThemedImage('logo.png', 'light')).toBe('logo.png');
  });
  it('picks the theme-specific image', () => {
    const img = { light: 'l.png', dark: 'd.png' };
    expect(resolveThemedImage(img, 'dark')).toBe('d.png');
    expect(resolveThemedImage(img, 'light')).toBe('l.png');
  });
  it('falls back to the other theme when one is missing', () => {
    expect(resolveThemedImage({ light: 'l.png' }, 'dark')).toBe('l.png');
    expect(resolveThemedImage({ dark: 'd.png' }, 'light')).toBe('d.png');
  });
  it('falls back to placeholder when object is empty', () => {
    expect(resolveThemedImage({}, 'dark', 'ph.png')).toBe('ph.png');
  });
});

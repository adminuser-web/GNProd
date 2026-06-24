import { ThemedImage } from '../types';

export function resolveThemedImage(
  img: ThemedImage | undefined,
  theme: 'light' | 'dark',
  placeholder: string = ''
): string {
  if (!img) return placeholder;

  if (typeof img === 'string') {
    return img;
  }

  if (theme === 'dark' && img.dark) {
    return img.dark;
  }

  if (theme === 'light' && img.light) {
    return img.light;
  }

  // Fallbacks
  return img.light || img.dark || placeholder;
}

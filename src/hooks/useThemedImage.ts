import { useTheme } from '../context/ThemeContext';
import { resolveThemedImage } from '../lib/themedImage';
import { ThemedImage } from '../types';
import { useMemo } from 'react';

export function useThemedImage(img: ThemedImage | undefined, placeholder?: string): string {
  const { theme } = useTheme();

  return useMemo(() => {
    return resolveThemedImage(img, theme, placeholder);
  }, [img, theme, placeholder]);
}

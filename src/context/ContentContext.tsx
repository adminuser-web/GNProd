import React, { createContext, useContext, useEffect, useState } from 'react';
import { SiteContentMap, DEFAULT_SITE_CONTENT } from '../types';
import { contentService } from '../features/content/services/contentService';

interface ContentContextProps {
  contentMap: SiteContentMap;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ContentContext = createContext<ContentContextProps>({
  contentMap: DEFAULT_SITE_CONTENT,
  loading: true,
  refresh: async () => {},
});

function isObject(item: any) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

function deepMerge(target: any, source: any): any {
  // If either side isn't a plain object (leaf value, or a type mismatch such as
  // a string default vs. a themed-image object), the saved/source value wins.
  // (The old version did Object.assign({}, "str") which shredded strings into
  // character-indexed objects like {0:'/',1:'h',...}.)
  if (!isObject(target) || !isObject(source)) {
    return source;
  }
  const output: any = { ...target };
  Object.keys(source).forEach(key => {
    if (isObject(target[key]) && isObject(source[key])) {
      output[key] = deepMerge(target[key], source[key]);
    } else {
      output[key] = source[key];
    }
  });
  return output;
}

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [contentMap, setContentMap] = useState<SiteContentMap>(DEFAULT_SITE_CONTENT);
  const [loading, setLoading] = useState(true);

  const fetchContent = async () => {
    try {
      const dbContent = await contentService.getAllAreas();
      
      const mergedMap: any = { ...DEFAULT_SITE_CONTENT };
      
      for (const key of Object.keys(DEFAULT_SITE_CONTENT)) {
        const area = key as keyof SiteContentMap;
        if (dbContent[area]) {
          mergedMap[area] = deepMerge(DEFAULT_SITE_CONTENT[area], dbContent[area]);
        }
      }
      
      setContentMap(mergedMap);
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  return (
    <ContentContext.Provider value={{ contentMap, loading, refresh: fetchContent }}>
      {children}
    </ContentContext.Provider>
  );
}

export function useContent<K extends keyof SiteContentMap>(area: K): SiteContentMap[K] {
  const { contentMap } = useContext(ContentContext);
  return contentMap[area];
}

export function useContentContext() {
  return useContext(ContentContext);
}

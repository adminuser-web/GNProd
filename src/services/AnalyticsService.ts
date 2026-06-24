export const AnalyticsService = {
  trackPageview: (path: string) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'page_view', { page_path: path });
    } else {
      console.log(`[Analytics] Mock Pageview: ${path}`);
    }
  },
  trackEvent: (category: string, action: string, label?: string) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', action, {
        event_category: category,
        event_label: label,
      });
    } else {
      console.log(`[Analytics] Mock Event: ${category} - ${action} ${label ? `(${label})` : ''}`);
    }
  }
};

export interface SeoPayload {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  robots?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let tag = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    document.head.appendChild(tag);
  }
  Object.entries(attributes).forEach(([key, value]) => tag?.setAttribute(key, value));
}

export function applySeo(payload: SeoPayload) {
  document.title = payload.title;
  upsertMeta('meta[name="description"]', { name: "description", content: payload.description });
  upsertMeta('meta[property="og:title"]', { property: "og:title", content: payload.title });
  upsertMeta('meta[property="og:description"]', { property: "og:description", content: payload.description });
  upsertMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
  upsertMeta('meta[name="robots"]', { name: "robots", content: payload.robots || "index,follow" });
  if (payload.image) {
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: payload.image });
  }
  const base = window.location.origin;
  const canonicalHref = payload.canonicalPath ? new URL(payload.canonicalPath, base).toString() : window.location.href;
  let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = canonicalHref;
  document.querySelectorAll('script[data-seo-jsonld="true"]').forEach((node) => node.remove());
  if (payload.jsonLd) {
    const scripts = Array.isArray(payload.jsonLd) ? payload.jsonLd : [payload.jsonLd];
    scripts.forEach((item) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.seoJsonld = "true";
      script.textContent = JSON.stringify(item);
      document.head.appendChild(script);
    });
  }
}

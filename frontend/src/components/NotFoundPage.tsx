import { Seo } from "./Seo";

export function NotFoundPage() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <Seo title="404 — EventFinder" description="Страница не найдена" robots="noindex,nofollow" canonicalPath="/404" />
      <h1 className="mb-3">404</h1>
      <p className="text-muted-foreground">Такой страницы не существует или она была перенесена.</p>
    </div>
  );
}

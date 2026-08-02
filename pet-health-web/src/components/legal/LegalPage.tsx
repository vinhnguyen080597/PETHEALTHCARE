import type { Lang } from "@/lib/types";

export function LegalPage({
  lang,
  title,
  titleVI,
  childrenEN,
  childrenVI,
}: {
  lang: Lang;
  title: string;
  titleVI: string;
  childrenEN: React.ReactNode;
  childrenVI: React.ReactNode;
}) {
  return (
    <article className="max-w-3xl mx-auto px-5 py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">
        {lang === "VI" ? titleVI : title}
      </h1>
      <div className="prose prose-slate text-sm leading-relaxed space-y-4 text-slate-600">
        {lang === "VI" ? childrenVI : childrenEN}
      </div>
    </article>
  );
}

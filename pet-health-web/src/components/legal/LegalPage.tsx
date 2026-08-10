import type { Lang } from "@/lib/types";
import type { LegalDoc } from "@/lib/legalContent";
import { LEGAL_SUPPORT_EMAIL } from "@/lib/legalContent";

function linkifySupportEmail(text: string) {
  if (!text.includes(LEGAL_SUPPORT_EMAIL)) return text;
  const [before, after] = text.split(LEGAL_SUPPORT_EMAIL);
  return (
    <>
      {before}
      <a
        className="text-[#D97706] underline underline-offset-2"
        href={`mailto:${LEGAL_SUPPORT_EMAIL}`}
      >
        {LEGAL_SUPPORT_EMAIL}
      </a>
      {after}
    </>
  );
}

export function LegalDocBody({ doc }: { doc: LegalDoc }) {
  return (
    <>
      <p className="text-xs text-slate-400">{doc.updated}</p>
      <p>{doc.intro}</p>
      {doc.sections.map((section) => (
        <section key={section.heading || section.paragraphs?.[0] || "section"}>
          {section.heading ? (
            <h2 className="text-base font-semibold text-slate-800 mt-2 mb-2">
              {section.heading}
            </h2>
          ) : null}
          {section.paragraphs?.map((p) => (
            <p key={p.slice(0, 48)}>{linkifySupportEmail(p)}</p>
          ))}
          {section.bullets?.length ? (
            <ul className="list-disc pl-5 space-y-2">
              {section.bullets.map((item) => (
                <li key={item.slice(0, 48)}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </>
  );
}

export function LegalPage({
  lang,
  title,
  titleVI,
  docEN,
  docVI,
}: {
  lang: Lang;
  title: string;
  titleVI: string;
  docEN: LegalDoc;
  docVI: LegalDoc;
}) {
  return (
    <article className="max-w-3xl mx-auto px-5 py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">
        {lang === "VI" ? titleVI : title}
      </h1>
      <div className="prose prose-slate text-sm leading-relaxed space-y-4 text-slate-600">
        <LegalDocBody doc={lang === "VI" ? docVI : docEN} />
      </div>
    </article>
  );
}

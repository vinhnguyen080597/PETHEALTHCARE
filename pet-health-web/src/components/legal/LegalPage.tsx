import type { Lang } from "@/lib/types";
import type { LegalDoc } from "@/lib/legalContent";
import { LEGAL_EMAILS } from "@/lib/legalContent";

const EMAIL_PATTERN = new RegExp(
  `(${LEGAL_EMAILS.map((email) => email.replace(/\./g, "\\.")).join("|")})`,
  "g",
);

function linkifySupportEmail(text: string) {
  if (!LEGAL_EMAILS.some((email) => text.includes(email))) return text;
  const nodes: Array<string | ReturnType<typeof mailtoLink>> = [];
  let last = 0;
  for (const match of text.matchAll(EMAIL_PATTERN)) {
    const email = match[0];
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    nodes.push(mailtoLink(email, `${email}-${index}`));
    last = index + email.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

function mailtoLink(email: string, key: string) {
  return (
    <a
      key={key}
      className="text-[#D97706] underline underline-offset-2"
      href={`mailto:${email}`}
    >
      {email}
    </a>
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
                <li key={item.slice(0, 48)}>{linkifySupportEmail(item)}</li>
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

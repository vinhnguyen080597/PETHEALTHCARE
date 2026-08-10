import { brandUi, splitBrandName } from "@/lib/brand";

/** Logo wordmark: orange “PetCare” + neutral “: Pet Marketplace”. */
export function BrandWordmark({
  text,
  className = "font-bold text-sm tracking-tight",
  tone = "onLight",
}: {
  text: string;
  className?: string;
  /** Header sits on cream; footer sits on charcoal. */
  tone?: "onLight" | "onDark";
}) {
  const { lead, rest } = splitBrandName(text);
  const restCls = tone === "onDark" ? "text-white" : "text-stone-900";
  return (
    <span className={className}>
      <span className={brandUi.primaryText}>{lead}</span>
      {rest ? <span className={restCls}>{rest}</span> : null}
    </span>
  );
}

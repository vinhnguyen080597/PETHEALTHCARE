/** Personality chips — neutral gray (not brand amber/blue). */
export function listingPersonalityTagClass(): string {
  return "px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full";
}

export type ListingWarrantyCardTone = {
  shell: string;
  title: string;
  hint: string;
  updateBtn: string;
};

/**
 * Warranty card tones on listing detail.
 * - Has policy: cool sky (policy/info) so it does not collide with amber deposit-hold.
 * - None: slate (quiet empty state).
 */
export function listingWarrantyCardTone(hasPolicy: boolean): ListingWarrantyCardTone {
  if (!hasPolicy) {
    return {
      shell: "rounded-xl border border-slate-200 bg-slate-50 p-4",
      title: "text-sm font-bold text-slate-800 mb-1",
      hint: "text-xs text-slate-500",
      updateBtn:
        "shrink-0 px-3 py-1.5 border border-slate-300 bg-white text-slate-700 text-xs font-semibold rounded-full hover:bg-slate-100 transition-colors",
    };
  }
  return {
    shell: "rounded-xl border border-sky-200 bg-sky-50/80 p-4",
    title: "text-sm font-bold text-sky-950 mb-1",
    hint: "text-xs text-sky-900/80",
    updateBtn:
      "shrink-0 px-3 py-1.5 border border-sky-300 bg-white text-sky-950 text-xs font-semibold rounded-full hover:bg-sky-50 transition-colors",
  };
}

export type ListingDealStatusTone = {
  shell: string;
  title: string;
  menuBtn: string;
  menuPanel: string;
};

/**
 * Deal status cards:
 * - deposit_hold: amber (attention / in-progress deal — matches listing card badge)
 * - sold: emerald (completed)
 */
export function listingDealStatusTone(
  status: "deposit_hold" | "sold",
): ListingDealStatusTone {
  if (status === "sold") {
    return {
      shell:
        "text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2",
      title: "",
      menuBtn: "",
      menuPanel: "",
    };
  }
  return {
    shell: "rounded-xl border border-amber-300 bg-amber-50 p-4",
    title: "text-sm font-semibold text-amber-900 min-w-0 flex-1",
    menuBtn:
      "h-8 w-8 inline-flex items-center justify-center rounded-full text-amber-900 hover:bg-amber-100 disabled:opacity-50",
    menuPanel:
      "absolute right-0 top-9 z-20 min-w-[12rem] rounded-xl border border-amber-200 bg-white py-1 shadow-lg",
  };
}

"use client";

/** Centered loading popup over the current page (dimmed backdrop). */
export function LoadingPopup({
  label = "Loading…",
}: {
  label?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#2B1E19]/35 backdrop-blur-[2px] p-5"
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
    >
      <div className="w-full max-w-[280px] rounded-2xl border border-[#F0E6D8] bg-[#FDFBF7] px-6 py-8 shadow-[0_20px_50px_-20px_rgba(43,30,25,0.45)] flex flex-col items-center gap-4">
        <div
          className="h-9 w-9 rounded-full border-[2.5px] border-[#F0E6D8] border-t-[#D97706] animate-spin"
          aria-hidden
        />
        <p className="text-sm font-medium text-[#2B1E19] text-center">{label}</p>
      </div>
    </div>
  );
}

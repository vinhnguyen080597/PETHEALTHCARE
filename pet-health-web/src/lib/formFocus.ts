/** Scroll the first invalid field into view and focus it after form validation fails. */
export function scrollFieldIntoView(
  el: HTMLElement | null | undefined,
  opts?: { behavior?: ScrollBehavior; block?: ScrollLogicalPosition },
): boolean {
  if (!el) return false;
  el.scrollIntoView({
    behavior: opts?.behavior ?? "smooth",
    block: opts?.block ?? "center",
  });
  if (typeof el.focus === "function") {
    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }
  }
  return true;
}

/** Resolve the first invalid control by id (DOM order of ids). */
export function firstInvalidFieldId(
  errors: Record<string, string | undefined>,
  fieldIds: readonly string[],
): string | null {
  for (const id of fieldIds) {
    if (errors[id]?.trim()) return id;
  }
  return null;
}

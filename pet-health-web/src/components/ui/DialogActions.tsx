"use client";

import type { ReactNode } from "react";
import {
  DIALOG_ACTIONS_ROW_CLASS,
} from "@/lib/dialogActions";

/** Footer for dialogs: always one horizontal row. Secondary left, primary right. */
export function DialogActions({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${DIALOG_ACTIONS_ROW_CLASS} ${className}`.trim()}>
      {children}
    </div>
  );
}

import test from "node:test";
import assert from "node:assert/strict";
import {
  DIALOG_ACTION_BTN_CLASS,
  DIALOG_ACTIONS_ROW_CLASS,
} from "../src/lib/dialogActions";

test("dialog action buttons stay on one horizontal row", () => {
  assert.match(DIALOG_ACTIONS_ROW_CLASS, /\bflex\b/);
  assert.match(DIALOG_ACTIONS_ROW_CLASS, /\bgap-2\b/);
  assert.equal(/flex-col/.test(DIALOG_ACTIONS_ROW_CLASS), false);
  assert.equal(DIALOG_ACTION_BTN_CLASS, "flex-1");
});

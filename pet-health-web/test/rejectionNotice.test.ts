import test from "node:test";
import assert from "node:assert/strict";
import {
  isGenericListingRejectedPreview,
  resolveRejectionNotice,
} from "../src/lib/notifications/rejectionNotice";

test("generic listing-rejected previews are not treated as the admin reason", () => {
  assert.equal(
    isGenericListingRejectedPreview('Bài đăng "gà bé mèo con" chưa được duyệt.'),
    true,
  );
  assert.equal(isGenericListingRejectedPreview("Admin did not approve your listing."), true);
  assert.equal(isGenericListingRejectedPreview("Thiếu sổ tiêm và ảnh môi trường"), false);
});

test("resolveRejectionNotice prefers stored reason over generic body preview", () => {
  assert.deepEqual(
    resolveRejectionNotice({
      body_preview: 'Bài đăng "gà bé mèo con" chưa được duyệt.',
      rejection_reason: "Thiếu sổ tiêm",
      metadata: { admin_action: "Bổ sung ảnh" },
    }),
    {
      reason: "Thiếu sổ tiêm",
      adminAction: "Bổ sung ảnh",
      adminNote: "",
    },
  );

  assert.equal(
    resolveRejectionNotice({
      body_preview: 'Bài đăng "gà bé mèo con" chưa được duyệt.',
    }).reason,
    "",
  );
});

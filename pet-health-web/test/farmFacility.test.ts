import test from "node:test";
import assert from "node:assert/strict";
import {
  FARM_FACILITY_VIDEO_ASPECT,
  FARM_FACILITY_VIDEO_MAX_HEIGHT_PX,
  FARM_OVERVIEW_SECTIONS,
  farmFacilityHasContent,
  farmFacilitySocialLinks,
  maskZaloPublicDisplay,
  publicFacilityVideoUrl,
} from "../src/lib/farmFacility";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";

test("maskZaloPublicDisplay keeps first 3 and last 3 digits", () => {
  assert.equal(maskZaloPublicDisplay("0901234567"), "090***567");
  assert.equal(maskZaloPublicDisplay("0421234089"), "042***089");
  assert.equal(maskZaloPublicDisplay("84901234567"), "090***567");
  assert.equal(maskZaloPublicDisplay("12"), "");
});

test("farmFacilitySocialLinks masks Zalo and links other networks", () => {
  const links = farmFacilitySocialLinks({
    facebook: "https://www.facebook.com/myfarm",
    zalo: "0901234567",
    tiktok: "https://www.tiktok.com/@farm",
    instagram: "https://www.instagram.com/farm",
  });
  assert.deepEqual(
    links.map((row) => row.id),
    ["facebook", "zalo", "tiktok", "instagram"],
  );
  assert.equal(links[0]?.href, "https://www.facebook.com/myfarm");
  assert.equal(links[0]?.display, "facebook.com/myfarm");
  assert.equal(links[1]?.display, "090***567");
  assert.equal(links[1]?.href, null);
});

test("publicFacilityVideoUrl only returns admin-approved https clips", () => {
  assert.equal(publicFacilityVideoUrl({}), null);
  assert.equal(
    publicFacilityVideoUrl({
      facility_video_url: "https://cdn.example/v.mp4",
    }),
    null,
  );
  assert.equal(
    publicFacilityVideoUrl({
      facility_video_trust_awarded: true,
      facility_video_url: "https://cdn.example/v.mp4",
    }),
    "https://cdn.example/v.mp4",
  );
});

test("farm facility overview order and video frame stay compact 16:9", () => {
  assert.deepEqual([...FARM_OVERVIEW_SECTIONS], ["health", "facility", "reviews"]);
  assert.equal(FARM_FACILITY_VIDEO_ASPECT, "16 / 9");
  assert.equal(FARM_FACILITY_VIDEO_MAX_HEIGHT_PX, 420);
  assert.equal(
    farmFacilityHasContent({ bio: "", socialCount: 0, videoUrl: null }),
    false,
  );
  assert.equal(
    farmFacilityHasContent({
      bio: "",
      socialCount: 1,
      videoUrl: null,
    }),
    true,
  );
});

test("farm facility social i18n exists in EN and VI", () => {
  const enDict = en as Record<string, string>;
  const viDict = vi as Record<string, string>;
  for (const key of [
    "farm.facility.social",
    "farm.facility.facebook",
    "farm.facility.zalo",
    "farm.facility.tiktok",
    "farm.facility.instagram",
    "farm.facility.video",
  ] as const) {
    assert.ok(enDict[key], `missing EN ${key}`);
    assert.ok(viDict[key], `missing VI ${key}`);
  }
  assert.equal(viDict["farm.facility.zalo"], "Zalo");
  assert.equal(viDict["farm.facility.video"], "Video cơ sở");
});

import { describe, expect, it } from "vitest";
import { describePostEntryError } from "./post-entry";

describe("describePostEntryError", () => {
  it("レート制限は窓の内容と再試行までの時間を伝える", () => {
    const message = describePostEntryError({
      code: "rate_limited",
      scope: "burst",
      retryAfterSeconds: 240,
    });

    expect(message).toContain("5分に5件");
    expect(message).toContain("4分");
  });

  it("slug 枯渇は再試行を促す", () => {
    expect(describePostEntryError({ code: "slug_exhausted" })).toContain("再試行");
  });
});

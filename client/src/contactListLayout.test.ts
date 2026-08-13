import { describe, expect, it } from "vitest";

import { CONTACTS_GRID_CLASSES } from "@/contactListLayout";

describe("contact list layout", () => {
  it("uses a responsive one/two/three column grid", () => {
    expect(CONTACTS_GRID_CLASSES).toContain("grid-cols-1");
    expect(CONTACTS_GRID_CLASSES).toContain("md:grid-cols-2");
    expect(CONTACTS_GRID_CLASSES).toContain("xl:grid-cols-3");
  });
});

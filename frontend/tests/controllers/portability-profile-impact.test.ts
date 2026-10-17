// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { asPortabilityHost, importPortableData } from "../../src/velair/controllers/portability-actions";

describe("Profile import exception confirmation", () => {
  it("cancels reference removal before sending the import and reports the affected zones", async () => {
    const importData = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const host = asPortabilityHost({
      _data: { profile_selection: { base_profile_ids: [], base_mode_id: null,
        zone_profile_overrides: { "climate.office": "work", "climate.bedroom": null } } },
      _importPayload: { sections: { profiles: [] } }, _importSections: new Set(["profiles"]),
      _api: () => ({ importData }), _t: (key: string) => key,
    });
    await importPortableData(host);
    expect(confirm).toHaveBeenCalledWith("profileImportOverridesWarning\nclimate.office");
    expect(importData).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});

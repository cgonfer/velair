// @vitest-environment jsdom
import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import type { VelairViewHost } from "../../src/velair/host-types";
import { translate } from "../../src/velair/i18n";
import { renderSettingsHighBrakingSteps } from "../../src/velair/views/settings-view";

function fixture(steps?: number, step: number | undefined = .5, unit = "°C") {
  const save = vi.fn(async () => {});
  const host = {
    _data: { zones: {
      "climate.living": { preconditioning: { room_sensor_assist_high_braking_steps: steps } },
      "climate.bedroom": { preconditioning: {} },
    } },
    _entityTemperatureStep: () => step,
    _temperatureUnit: () => unit,
    _saveZonePreconditioning: save,
    _settingsSaving: false,
    _t: (key: string, values?: Record<string, string | number>) => translate("en", key, values),
  } as unknown as VelairViewHost;
  const container = document.createElement("div");
  render(renderSettingsHighBrakingSteps(host, "climate.living"), container);
  return { host, container, save, input: container.querySelector("input")! };
}

describe("per-zone High braking steps in Settings", () => {
  it.each([[.5, "°C", "1.5 °C"], [1, "°F", "3 °F"], [.9, "°F", "2.7 °F"], [.25, "°C", ".75 °C"]])(
    "shows the equivalent delta for step %s %s without absolute conversion or rounding away supported steps",
    (step, unit, equivalent) => {
      const { container, input } = fixture(3, step as number, unit as string);
      expect(input.value).toBe("3");
      expect(container.querySelector(".settings-high-braking-equivalent")?.textContent).toContain(equivalent);
      expect(container.querySelector("label")?.htmlFor).toBe(input.id);
      expect(container.querySelector(`#${input.getAttribute("aria-describedby")}`)).not.toBeNull();
    },
  );

  it("defaults to two and keeps independent values and IDs for each zone", () => {
    const { host, container, input } = fixture();
    expect(input.value).toBe("2");
    host._data!.zones["climate.living"].preconditioning!.room_sensor_assist_high_braking_steps = 3;
    render([renderSettingsHighBrakingSteps(host, "climate.living"), renderSettingsHighBrakingSteps(host, "climate.bedroom")], container);
    const inputs = [...container.querySelectorAll("input")];
    expect(inputs.map(input => input.value)).toEqual(["3", "2"]);
    expect(inputs[0].id).not.toBe(inputs[1].id);
  });

  it("saves only the intended zone through the existing backend flow and waits for confirmation", () => {
    const { host, container, input, save } = fixture();
    input.value = "3";
    input.dispatchEvent(new Event("change"));
    expect(save).toHaveBeenCalledExactlyOnceWith("climate.living", { room_sensor_assist_high_braking_steps: 3 });
    expect(input.value).toBe("2");
    expect(container.textContent).toContain("Equivalent to 1 °C");
    host._data!.zones["climate.living"].preconditioning!.room_sensor_assist_high_braking_steps = 3;
    render(renderSettingsHighBrakingSteps(host, "climate.living"), container);
    expect(input.value).toBe("3");
    expect(container.textContent).toContain("Equivalent to 1.5 °C");
  });

  it.each(["", "0", "1", "11", "2.5", "NaN"])("rejects invalid count %s without sending a mutation", value => {
    const { input, save } = fixture();
    input.value = value;
    input.dispatchEvent(new Event("change"));
    expect(save).not.toHaveBeenCalled();
    expect(input.value).toBe("2");
  });

  it("disables the input while saving and hides it for externally controlled zones", () => {
    const { host, container } = fixture();
    host._settingsSaving = true;
    render(renderSettingsHighBrakingSteps(host, "climate.living"), container);
    expect(container.querySelector("input")?.disabled).toBe(true);
    host._data!.zones["climate.living"].execution = { type: "external" } as never;
    render(renderSettingsHighBrakingSteps(host, "climate.living"), container);
    expect(container.querySelector("input")).toBeNull();
  });

  it("does not invent a temperature equivalent if the equipment step is unavailable", () => {
    const { host, container } = fixture();
    host._entityTemperatureStep = () => undefined;
    render(renderSettingsHighBrakingSteps(host, "climate.living"), container);
    expect(container.textContent).toContain("when the equipment step is available");
    expect(container.textContent).not.toContain("Equivalent to");
  });
});

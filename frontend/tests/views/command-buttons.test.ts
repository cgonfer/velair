// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { baseStyles } from "../../src/velair/styles/base-styles";
import { diagnosticsStyles } from "../../src/velair/styles/diagnostics-styles";
import { VelairProfilesView } from "../../src/velair/components/profiles-view-element";
import { profileStyles } from "../../src/velair/styles/profile-styles";

const created: HTMLElement[] = [];
afterEach(() => { for (const node of created.splice(0)) node.remove(); });

function commands(compact: boolean) {
  const style = document.createElement("style");
  style.textContent = (VelairProfilesView.styles.flat(Infinity) as Array<{ cssText: string }>).map((entry) => entry.cssText).join("\n");
  document.head.append(style); created.push(style);
  const host = document.createElement("div");
  host.style.font = "14px sans-serif";
  host.innerHTML = `<button class="command-button ${compact ? "compact" : ""}"><ha-icon></ha-icon><span>Save</span></button>
    <details><summary class="command-button active-setup-change ${compact ? "compact" : ""}"><ha-icon></ha-icon><span>Change</span></summary></details>`;
  document.body.append(host); created.push(host);
  return [...host.querySelectorAll<HTMLElement>(".command-button")];
}

describe("shared command button sizing", () => {
  it.each([false, true])("uses the same border-box sizing for native buttons and Change summaries (compact=%s)", (compact) => {
    const [button, summary] = commands(compact).map((node) => getComputedStyle(node));
    for (const computed of [button, summary]) {
      expect(computed.boxSizing).toBe("border-box");
      expect(computed.minHeight).toBe(compact ? "34px" : "38px");
      expect(computed.paddingTop).toBe(compact ? "4px" : "6px");
      expect(computed.paddingBottom).toBe(compact ? "4px" : "6px");
      expect(computed.alignSelf).toBe("center");
    }
    expect(summary.fontFamily).toBe(button.fontFamily);
    expect(summary.fontSize).toBe(button.fontSize);
    expect(summary.lineHeight).toBe(button.lineHeight);
    expect(baseStyles.cssText).toMatch(/\.command-button\s*\{[^}]*line-height: 1.25/);
  });

  it("retains a shared 44px touch minimum for standard and compact commands", () => {
    expect(baseStyles.cssText).toMatch(/@media \(any-pointer: coarse\)\s*\{\s*\.command-button,\s*\.command-button\.compact\s*\{\s*min-height: 44px/);
    expect(profileStyles.cssText).not.toMatch(/\.active-setup-change\s*\{[^}]*min-height/);
  });
});


it("lets long command labels wrap instead of hiding part of the action", () => {
  const [button] = commands(false);
  const label = button.querySelector("span")!;
  label.textContent = "A long translated action label that needs more than one line on mobile";
  const computed = getComputedStyle(label);
  expect(computed.whiteSpace).toBe("normal");
  expect(computed.overflowWrap).toBe("anywhere");
  expect(computed.textOverflow).not.toBe("ellipsis");
});


it("lets diagnostic text commands and Template Apply inherit the standard size", () => {
  commands(false);
  const host = document.createElement("div");
  host.innerHTML = `<section class="diagnostics-history-policy"><button class="command-button diagnostics-clear-history">Clear history</button></section>
    <button class="command-button diagnostics-clear-filters">Clear filters</button>
    <button class="command-button diagnostics-source-done">Done</button>
    <button class="command-button template-apply-button">Apply</button>`;
  document.body.append(host); created.push(host);
  for (const button of host.querySelectorAll("button")) {
    const computed = getComputedStyle(button);
    expect(computed.boxSizing).toBe("border-box");
    expect(computed.minHeight).toBe("38px");
    expect(computed.paddingTop).toBe("6px");
    expect(computed.paddingBottom).toBe("6px");
  }
  // Clear history deliberately becomes a square icon-only control on narrow
  // screens, with its own square touch expansion instead of restoring text padding.
  expect(diagnosticsStyles.cssText).toMatch(/@media \(max-width: 600px\) and \(any-pointer: coarse\)[\s\S]*diagnostics-clear-history\s*\{[^}]*height: 44px;[^}]*width: 44px;/);
});

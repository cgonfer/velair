import { VELAIR_FRONTEND_BUILD, VELAIR_RELEASE_VERSION } from "./velair/build-info";
import { VelairCard } from "./velair/components/velair-card-element";
import { registerVelairFrontend } from "./velair/registration";
import { VelairCardEditor } from "./velair/views/card-editor";
import { VelairPanel } from "./velair/views/panel";

export { VelairCard } from "./velair/components/velair-card-element";

registerVelairFrontend({
  build: VELAIR_FRONTEND_BUILD,
  customCard: {
    type: "velair-card",
    name: "Velair",
    description: "Climate automation that adapts to your life.",
  },
  elements: {
    "velair-card": VelairCard,
    "velair-card-editor": VelairCardEditor,
    "velair-main-panel": VelairPanel,
  },
  version: VELAIR_RELEASE_VERSION,
});

declare global {
  interface HTMLElementTagNameMap {
    "velair-card": VelairCard;
    "velair-card-editor": VelairCardEditor;
    "velair-main-panel": VelairPanel;
  }
}

type VelairElementConstructors = Record<string, CustomElementConstructor>;

type CustomCardEntry = {
  description: string;
  name: string;
  type: string;
};

export function registerVelairFrontend(options: {
  build: string;
  customCard: CustomCardEntry;
  elements: VelairElementConstructors;
  version?: string;
}): void {
  Object.entries(options.elements).forEach(([name, constructor]) => {
    if (!customElements.get(name)) {
      customElements.define(name, constructor);
    }
  });

  window.velairFrontendBuild = options.build;
  window.velairFrontendVersion = options.version || undefined;

  window.customCards = window.customCards ?? [];
  if (!window.customCards.some((card) => card.type === options.customCard.type)) {
    window.customCards.push(options.customCard);
  }
}

declare global {
  interface Window {
    velairFrontendBuild?: string;
    velairFrontendVersion?: string;
    customCards?: CustomCardEntry[];
  }
}

import { defineConfig } from "vite";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));
const integrationFrontendDir = resolve(rootDir, "../custom_components/velair/frontend");
const distDir = resolve(rootDir, "dist");
const manifestPath = resolve(rootDir, "../custom_components/velair/manifest.json");
const buildId = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const integrationVersion = JSON.parse(readFileSync(manifestPath, "utf-8")).version;

function copyBundleToIntegration() {
  return {
    name: "copy-bundle-to-integration",
    closeBundle() {
      mkdirSync(integrationFrontendDir, { recursive: true });
      copyFileSync(resolve(distDir, "velair-card.js"), resolve(integrationFrontendDir, "velair-card.js"));
      copyFileSync(resolve(distDir, "velair-card.js.map"), resolve(integrationFrontendDir, "velair-card.js.map"));
    },
  };
}

export default defineConfig(({ mode }) => {
  const isReleaseBuild = mode === "release" || process.env.npm_lifecycle_event === "release-build";

  return {
    plugins: [copyBundleToIntegration()],
    define: {
      __VELAIR_BUILD_ID__: JSON.stringify(buildId),
      __VELAIR_RELEASE_VERSION__: JSON.stringify(isReleaseBuild ? integrationVersion : ""),
    },
    build: {
      lib: {
        entry: "src/velair-card.ts",
        formats: ["es"],
        fileName: () => "velair-card.js",
      },
      outDir: "dist",
      sourcemap: true,
      rollupOptions: {
        external: [],
      },
    },
  };
});

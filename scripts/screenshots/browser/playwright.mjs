/** Use the frontend's pinned browser dependency without a second installation. */
import { createRequire } from "node:module";

const require = createRequire(new URL("../../../frontend/package.json", import.meta.url));
export const { chromium, expect } = require("@playwright/test");

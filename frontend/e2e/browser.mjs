import { chromium } from "@playwright/test";

/** The driver remains on the host; Chromium and its fonts run in pinned Linux. */
export function browserConnectOptions(endpoint = process.env.VELAIR_BROWSER_WS) {
  if (!endpoint) return undefined;
  const url = new URL(endpoint);
  if (url.protocol !== "ws:" || url.hostname !== "127.0.0.1" || !url.port || url.username || url.password || url.search || url.pathname !== "/") {
    throw new Error("The owned browser endpoint must be a loopback WebSocket URL");
  }
  return { wsEndpoint: url.href, exposeNetwork: "<loopback>" };
}

export function launchBrowser() {
  const options = browserConnectOptions();
  return options ? chromium.connect(options.wsEndpoint, options) : chromium.launch();
}

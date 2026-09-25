import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = resolve(fileURLToPath(new URL(".", import.meta.url)));
const webRoot = resolve(desktopRoot, "../web");
process.env.VITE_APP_MODE = "desktop";
process.env.VITE_BASE = "/";
const { build } = await import(new URL("../web/node_modules/vite/dist/node/index.js", import.meta.url));

await build({
    root: webRoot,
    configFile: resolve(webRoot, "vite.config.ts"),
    base: "/",
    build: {
        outDir: resolve(desktopRoot, "renderer-dist"),
        emptyOutDir: true,
    },
});

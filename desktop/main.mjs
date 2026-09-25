import { app, BrowserWindow, dialog, shell } from "electron";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import { extname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const APP_ID = "vip.nezhai.infinitecanvas";
const HOST = "127.0.0.1";
const PORT = 32100;
const LOCAL_ORIGIN = `http://${HOST}:${PORT}`;
const EXTERNAL_HOSTS = new Set(["nezhai.vip", "www.nezhai.vip", "github.com", "www.github.com", "docs.canvas.best"]);
const __dirname = fileURLToPath(new URL(".", import.meta.url));

if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.setAppUserModelId(APP_ID);
    let staticServer;
    let mainWindow;

    app.on("second-instance", () => {
        if (!mainWindow) return;
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    });

    app.whenReady().then(async () => {
        try {
            staticServer = await startStaticServer(resolve(__dirname, "renderer-dist"));
            mainWindow = createMainWindow();
            await mainWindow.loadURL(`${LOCAL_ORIGIN}/`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await dialog.showMessageBox({ type: "error", title: "哪吒无限画布无法启动", message });
            app.quit();
        }
    });

    app.on("before-quit", () => {
        staticServer?.close();
    });
}

function createMainWindow() {
    const window = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 680,
        show: false,
        title: "哪吒无限画布",
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webSecurity: true,
            partition: "persist:nezhai-infinite-canvas",
        },
    });

    window.once("ready-to-show", () => window.show());
    window.webContents.setWindowOpenHandler(({ url }) => {
        openExternalUrl(url);
        return { action: "deny" };
    });
    window.webContents.on("will-navigate", (event, url) => {
        try {
            if (new URL(url).origin === LOCAL_ORIGIN) return;
        } catch {
            // Treat malformed destinations as external and block them below.
        }
        event.preventDefault();
        openExternalUrl(url);
    });
    return window;
}

function openExternalUrl(url) {
    try {
        const parsed = new URL(url);
        if ((parsed.protocol === "https:" || parsed.protocol === "http:") && EXTERNAL_HOSTS.has(parsed.hostname.toLowerCase())) void shell.openExternal(parsed.toString());
    } catch {
        // Ignore malformed or unsupported external URLs.
    }
}

function startStaticServer(root) {
    const server = createHttpServer((request, response) => {
        void serveRequest(root, request, response);
    });
    return new Promise((resolveServer, reject) => {
        server.once("error", (error) => {
            if (error.code === "EADDRINUSE") reject(new Error(`本地端口 ${PORT} 已被占用，请关闭占用该端口的程序后重试。`));
            else reject(error);
        });
        server.listen(PORT, HOST, () => resolveServer(server));
    });
}

async function serveRequest(root, request, response) {
    if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405, { Allow: "GET, HEAD" });
        response.end();
        return;
    }
    const requestUrl = new URL(request.url || "/", LOCAL_ORIGIN);
    if (requestUrl.pathname === "/config.js") {
        response.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-store" });
        if (request.method === "HEAD") response.end();
        else response.end("window.__RUNTIME_CONFIG__ = {};\n");
        return;
    }
    let pathname;
    try {
        pathname = decodeURIComponent(requestUrl.pathname);
    } catch {
        response.writeHead(400);
        response.end("Bad request");
        return;
    }
    const candidate = resolve(root, `.${normalize(pathname)}`);
    const relativePath = relative(root, candidate);
    const isInsideRoot = candidate === root || (Boolean(relativePath) && !relativePath.startsWith(".."));
    if (!isInsideRoot) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
    }
    const filePath = await resolveStaticFile(root, candidate);
    if (!filePath) {
        response.writeHead(404);
        response.end("Not found");
        return;
    }
    const contentType = mimeType(extname(filePath));
    response.writeHead(200, { "Content-Type": contentType, "Cache-Control": contentType.includes("html") ? "no-store" : "public, max-age=31536000, immutable" });
    if (request.method === "HEAD") response.end();
    else createReadStream(filePath).pipe(response);
}

async function resolveStaticFile(root, candidate) {
    try {
        const info = await stat(candidate);
        if (info.isFile()) return candidate;
        if (info.isDirectory()) return resolveStaticFile(root, join(candidate, "index.html"));
    } catch {
        // Fall through to the SPA entry for client-side routes.
    }
    if (!extname(candidate)) {
        const indexPath = join(root, "index.html");
        try {
            const info = await stat(indexPath);
            if (info.isFile()) return indexPath;
        } catch {
            return null;
        }
    }
    return null;
}

function mimeType(extension) {
    return {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".ico": "image/x-icon",
        ".woff": "font/woff",
        ".woff2": "font/woff2",
    }[extension.toLowerCase()] || "application/octet-stream";
}

import { expect, test } from "bun:test";

import { getNezhaiConsoleUrl, getNezhaiLoginUrl, logoutNezhaiSession, refreshNezhaiSession } from "../src/services/nezhai-auth";

test("uses the canvas return path for Nezhai login", () => {
    expect(getNezhaiLoginUrl()).toBe("https://nezhai.vip/login?returnTo=%2Fcanvas%2F");
    expect(getNezhaiConsoleUrl()).toBe("https://nezhai.vip/console");
});

test("restores a session with cookies while keeping the token in the response", async () => {
    const originalFetch = globalThis.fetch;
    let request: Request | undefined;
    globalThis.fetch = async (input, init) => {
        request = new Request(input, init);
        return Response.json({ success: true, data: { access_token: "memory-only", user: { username: "tester" }, session: { sid: "sid-1" } } });
    };
    try {
        const session = await refreshNezhaiSession();
        expect(session).toEqual({ accessToken: "memory-only", user: { username: "tester" }, sid: "sid-1" });
        expect(request?.url).toBe("https://nezhai.vip/api/user/auth/refresh");
        expect(request?.method).toBe("POST");
        expect(request?.credentials).toBe("include");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("logs out using the current in-memory session", async () => {
    const originalFetch = globalThis.fetch;
    let request: Request | undefined;
    globalThis.fetch = async (input, init) => {
        request = new Request(input, init);
        return Response.json({ success: true });
    };
    try {
        await logoutNezhaiSession({ accessToken: "memory-only", sid: "sid-1" });
        expect(request?.url).toBe("https://nezhai.vip/api/user/auth/logout");
        expect(request?.headers.get("Authorization")).toBe("Bearer memory-only");
        expect(request?.headers.get("X-Auth-Session")).toBe("sid-1");
        expect(request?.credentials).toBe("include");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

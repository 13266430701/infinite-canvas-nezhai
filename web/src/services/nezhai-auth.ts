export type NezhaiUser = {
    id?: number | string;
    username?: string;
    nickname?: string;
    display_name?: string;
    displayName?: string;
    email?: string;
    [key: string]: unknown;
};

export type NezhaiAuthSession = {
    accessToken: string;
    sid?: string;
    user?: NezhaiUser | null;
};

type AuthResponse = {
    success?: boolean;
    message?: string;
    data?: {
        access_token?: string;
        session?: { sid?: string };
        user?: NezhaiUser | null;
    };
};

const NEZHA_ORIGIN = "https://nezhai.vip";

export function getNezhaiOrigin() {
    if (typeof window !== "undefined" && /(^|\.)nezhai\.vip$/i.test(window.location.hostname)) return window.location.origin;
    return String(import.meta.env.VITE_NEZHA_AUTH_ORIGIN || NEZHA_ORIGIN).replace(/\/+$/, "");
}

export function getNezhaiLoginUrl() {
    return `${getNezhaiOrigin()}/login?returnTo=${encodeURIComponent("/canvas/")}`;
}

export function getNezhaiConsoleUrl() {
    return `${getNezhaiOrigin()}/console`;
}

function getAuthHeaders(session?: NezhaiAuthSession) {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
    if (session?.sid) headers["X-Auth-Session"] = session.sid;
    return headers;
}

async function postAuth(path: string, session?: NezhaiAuthSession) {
    const response = await fetch(`${getNezhaiOrigin()}${path}`, {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(session),
    });
    let payload: AuthResponse | null = null;
    try {
        payload = (await response.json()) as AuthResponse;
    } catch {
        // Keep the HTTP status as the useful error when the server did not return JSON.
    }
    if (!response.ok || payload?.success === false) {
        const error = new Error(payload?.message || `Authentication request failed (${response.status})`);
        Object.assign(error, { status: response.status, payload });
        throw error;
    }
    return payload;
}

export async function refreshNezhaiSession() {
    const payload = await postAuth("/api/user/auth/refresh");
    const data = payload?.data;
    if (!data?.access_token) throw new Error("The authentication response did not contain an access token");
    return {
        accessToken: data.access_token,
        sid: data.session?.sid,
        user: data.user,
    } satisfies NezhaiAuthSession;
}

export async function logoutNezhaiSession(session: NezhaiAuthSession) {
    try {
        await postAuth("/api/user/auth/logout", session);
    } catch (error) {
        // A rotated refresh token can invalidate the old sid. Refresh once, then retry logout.
        if ((error as { status?: number }).status !== 409) throw error;
        const freshSession = await refreshNezhaiSession();
        await postAuth("/api/user/auth/logout", freshSession);
    }
}

import { create } from "zustand";

import { logoutNezhaiSession, refreshNezhaiSession, type NezhaiAuthSession, type NezhaiUser } from "@/services/nezhai-auth";

type AuthStatus = "idle" | "loading" | "authenticated" | "anonymous" | "error";

type NezhaiAuthStore = {
    status: AuthStatus;
    user: NezhaiUser | null;
    session: NezhaiAuthSession | null;
    refresh: () => Promise<void>;
    logout: () => Promise<void>;
};

let refreshPromise: Promise<void> | null = null;

export const useNezhaiAuthStore = create<NezhaiAuthStore>((set, get) => ({
    status: "idle",
    user: null,
    session: null,
    refresh: async () => {
        if (refreshPromise) return refreshPromise;
        set({ status: "loading" });
        refreshPromise = refreshNezhaiSession()
            .then((session) => set({ status: "authenticated", user: session.user || null, session }))
            .catch((error) => {
                const status = (error as { status?: number }).status;
                if (status === 401 || status === 403) set({ status: "anonymous", user: null, session: null });
                else set({ status: "error", user: null, session: null });
            })
            .finally(() => {
                refreshPromise = null;
            });
        return refreshPromise;
    },
    logout: async () => {
        if (refreshPromise) await refreshPromise;
        const session = get().session;
        set({ status: "loading" });
        let failure: unknown;
        try {
            if (session) await logoutNezhaiSession(session);
        } catch (error) {
            failure = error;
        } finally {
            set({ status: "anonymous", user: null, session: null });
        }
        if (failure) throw failure;
    },
}));

export type AppMode = "online" | "desktop";

export const APP_MODE: AppMode = import.meta.env.VITE_APP_MODE === "desktop" ? "desktop" : "online";
export const IS_DESKTOP_MODE = APP_MODE === "desktop";
export const NEZHA_CANVAS_URL = "https://nezhai.vip/canvas/";

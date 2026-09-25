import { App, Button, Tooltip } from "antd";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";

import { getNezhaiConsoleUrl, getNezhaiLoginUrl } from "@/services/nezhai-auth";
import { useNezhaiAuthStore } from "@/stores/use-nezhai-auth-store";

type NezhaiAuthActionsProps = {
    variant?: "default" | "canvas";
};

function userLabel(user: Record<string, unknown> | null) {
    if (!user) return "";
    return String(user.display_name || user.displayName || user.nickname || user.username || user.email || "");
}

export function NezhaiAuthActions({ variant = "default" }: NezhaiAuthActionsProps) {
    const { t } = useTranslation();
    const { message } = App.useApp();
    const status = useNezhaiAuthStore((state) => state.status);
    const user = useNezhaiAuthStore((state) => state.user);
    const logout = useNezhaiAuthStore((state) => state.logout);
    const iconClass = variant === "canvas" ? "text-stone-700 dark:text-stone-200" : "text-stone-600 dark:text-stone-300";
    const name = userLabel(user);

    if (status === "loading" || status === "idle") {
        return <span className="px-1 text-xs text-stone-500 dark:text-stone-400">{t("topNav.checkingLogin")}</span>;
    }

    if (status === "authenticated") {
        return (
            <div className="inline-flex max-w-56 items-center gap-1">
                <Tooltip title={t("topNav.loggedIn")}>
                    <span className={`inline-flex min-w-0 items-center gap-1 px-1 text-xs ${iconClass}`}>
                        <UserRound className="size-3.5 shrink-0" />
                        <span className="truncate">{name || t("topNav.loggedIn")}</span>
                    </span>
                </Tooltip>
                <a href={getNezhaiConsoleUrl()} className="hidden text-xs text-stone-600 hover:text-stone-950 sm:inline dark:text-stone-300 dark:hover:text-white">
                    {t("topNav.openConsole")}
                </a>
                <Button type="text" size="small" className="!px-1.5 !text-xs" icon={<LogOut className="size-3.5" />} onClick={() => void logout().catch(() => message.error(t("topNav.logoutFailed")))}>
                    {t("topNav.logout")}
                </Button>
            </div>
        );
    }

    return (
        <a href={getNezhaiLoginUrl()} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition hover:bg-black/5 hover:text-stone-950 dark:hover:bg-white/10 dark:hover:text-white ${iconClass}`}>
            <LogIn className="size-3.5" />
            {t("topNav.loginNezhai")}
        </a>
    );
}

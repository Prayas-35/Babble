"use client";

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const PROVIDER_CONFIG = {
    azure: {
        scopes: "email openid profile User.Read offline_access Mail.Read Mail.Send",
    },
    google: {
        // Gmail scopes are ready for when Google sign-in is wired up.
        scopes:
            "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send",
    },
} as const;

type AuthProviderName = keyof typeof PROVIDER_CONFIG;

type StoredTokens = {
    accessToken: string;
    provider_token: string;
    refreshToken: string | null;
    provider_refresh_token?: string | null;
    expiresAt: number | null;
    provider: string | null;
};

type AuthContextValue = {
    session: Session | null;
    user: User | null;
    tokens: StoredTokens | null;
    loading: boolean;
    error: string | null;
    signIn: (provider: AuthProviderName) => Promise<void>;
    signOut: () => Promise<void>;
    refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [supabaseClient, setSupabaseClient] = useState<
        Awaited<ReturnType<typeof createClient>> | null
    >(null);
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);
    const [initialized, setInitialized] = useState(false);
    const [authLoading, setAuthLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        let unsubscribe: (() => void) | undefined;

        createClient()
            .then((client) => {
                if (!isMounted) return;
                setSupabaseClient(client);

                client.auth
                    .getSession()
                    .then(({ data, error }) => {
                        if (!isMounted) return;
                        setSession(data.session ?? null);
                        setUser(data.session?.user ?? null);
                        setAuthError(error?.message ?? null);
                        setInitialized(true);
                    })
                    .catch((error) => {
                        if (!isMounted) return;
                        setAuthError(error instanceof Error ? error.message : String(error));
                        setInitialized(true);
                    });

                const { data } = client.auth.onAuthStateChange((_, nextSession) => {
                    if (!isMounted) return;
                    setSession(nextSession);
                    setUser(nextSession?.user ?? null);
                });

                unsubscribe = () => {
                    data.subscription?.unsubscribe();
                };
            })
            .catch((error) => {
                if (!isMounted) return;
                setAuthError(error instanceof Error ? error.message : String(error));
                setInitialized(true);
            });

        return () => {
            isMounted = false;
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;

        if (!session) {
            window.localStorage.removeItem("authTokens");
            return;
        }

        const payload: StoredTokens = {
            accessToken: session.access_token,
            provider_token: session.provider_token!,
            refreshToken: session.refresh_token,
            provider_refresh_token: session.provider_refresh_token ?? null,
            expiresAt: session.expires_at ?? null,
            provider: session.user?.app_metadata?.provider ?? null,
        };

        window.localStorage.setItem("authTokens", JSON.stringify(payload));
    }, [session]);

    const signIn = async (provider: AuthProviderName) => {
        if (!supabaseClient) return;
        setAuthLoading(true);
        setAuthError(null);

        const { scopes } = PROVIDER_CONFIG[provider];

        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider,
            options: {
                scopes,
                redirectTo:
                    typeof window !== "undefined"
                        ? `${window.location.origin}/auth/callback`
                        : undefined,
            },
        });

        if (error) {
            setAuthError(error.message);
        }

        setAuthLoading(false);
    };

    const signOut = async () => {
        if (!supabaseClient) return;
        setAuthLoading(true);
        setAuthError(null);

        const { error } = await supabaseClient.auth.signOut();

        // Clear provider cookies set during auth callback
        if (typeof document !== "undefined") {
            document.cookie = "provider_token=; path=/; max-age=0";
            document.cookie = "provider_refresh_token=; path=/; max-age=0";
            document.cookie = "auth_provider=; path=/; max-age=0";
        }

        if (error) {
            setAuthError(error.message);
        }

        setAuthLoading(false);
    };

    const refreshSession = async () => {
        if (!supabaseClient) return;
        setAuthLoading(true);

        const { data, error } = await supabaseClient.auth.refreshSession();

        if (error) {
            setAuthError(error.message);
        } else {
            setSession(data.session ?? null);
            setUser(data.session?.user ?? null);
        }

        setAuthLoading(false);
    };

    const tokens = useMemo<StoredTokens | null>(() => {
        if (!session) return null;

        // Supabase only exposes provider_token during the initial OAuth exchange.
        // After the server-side callback redirect, session.provider_token is null.
        // We fall back to cookies that were set in /auth/callback/route.ts.
        let providerToken = session.provider_token ?? null;
        let providerRefreshToken = session.provider_refresh_token ?? null;
        let provider: string | null = session.user?.app_metadata?.provider ?? null;

        if (typeof document !== "undefined" && !providerToken) {
            const jar = Object.fromEntries(
                document.cookie.split(";").map((c) => {
                    const [k, ...v] = c.trim().split("=");
                    return [k, v.join("=")];
                })
            );
            providerToken = jar["provider_token"] || null;
            providerRefreshToken = providerRefreshToken || jar["provider_refresh_token"] || null;
            provider = provider || jar["auth_provider"] || null;
        }

        return {
            accessToken: session.access_token,
            provider_token: providerToken as string,
            refreshToken: session.refresh_token,
            provider_refresh_token: providerRefreshToken,
            expiresAt: session.expires_at ?? null,
            provider,
        };
    }, [session]);

    const value = useMemo<AuthContextValue>(
        () => ({
            session,
            user,
            tokens,
            loading: !initialized || authLoading,
            error: authError,
            signIn,
            signOut,
            refreshSession,
        }),
        [session, user, tokens, initialized, authLoading, authError]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return ctx;
}

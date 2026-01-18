"use client";

import { useMemo } from "react";
import { useAuth } from "@/app/context/AuthContext";

export default function OutlookPage() {
    const { user, tokens, loading, error, signIn, signOut } = useAuth();

    const providerButtons = useMemo(
        () => [
            {
                label: "Sign in with Microsoft",
                provider: "azure" as const,
            },
            {
                label: "Prepare Gmail sign-in",
                provider: "google" as const,
            },
        ],
        []
    );

    return (
        <main className="space-y-6 p-6">
            <section className="space-y-3">
                <h1 className="text-2xl font-semibold">Email integrations</h1>
                <p className="text-sm text-zinc-600">
                    Authenticate with Microsoft now. Gmail is wired into the context so it can
                    be enabled with provider credentials later.
                </p>
                <div className="flex flex-wrap gap-3">
                    {providerButtons.map((btn) => (
                        <button
                            key={btn.provider}
                            onClick={() => signIn(btn.provider)}
                            disabled={loading}
                            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                        >
                            {loading ? "Working..." : btn.label}
                        </button>
                    ))}
                    {user && (
                        <button
                            onClick={signOut}
                            disabled={loading}
                            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Sign out
                        </button>
                    )}
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
            </section>

            <section className="space-y-2 rounded-lg border border-dashed border-zinc-300 p-4">
                <h2 className="text-lg font-medium">Session</h2>
                {user ? (
                    <div className="space-y-1 text-sm text-zinc-700">
                        <p>
                            Signed in as <span className="font-semibold">{user.email}</span>
                        </p>
                        <p>Provider: {user.app_metadata?.provider ?? "unknown"}</p>
                        {tokens?.accessToken && (
                            <p className="text-zinc-600">
                                Access and refresh tokens are stored locally for API use.
                            </p>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-zinc-600">No active session yet.</p>
                )}
            </section>
        </main>
    );
}
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/chat';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      const response = NextResponse.redirect(`${origin}${next}`);

      // Supabase does NOT persist provider_token in cookies.
      // We must capture it here (the only place it's available server-side)
      // and store it so the client can use it for Microsoft Graph / Gmail API calls.
      const cookieOpts = {
        path: '/',
        httpOnly: false, // Client JS needs to read this for API calls
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 3600, // 1 hour — matches typical OAuth token lifetime
      };

      if (data.session.provider_token) {
        response.cookies.set(
          'provider_token',
          data.session.provider_token,
          cookieOpts,
        );
      }
      if (data.session.provider_refresh_token) {
        response.cookies.set(
          'provider_refresh_token',
          data.session.provider_refresh_token,
          cookieOpts,
        );
      }

      const provider = data.session.user?.app_metadata?.provider;
      if (provider) {
        response.cookies.set('auth_provider', provider, cookieOpts);
      }

      return response;
    }
    console.error('Auth callback error:', error?.message);
  }

  // If code exchange failed or no code, redirect to landing with error
  return NextResponse.redirect(`${origin}/?error=auth_failed`);
}

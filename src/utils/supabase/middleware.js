import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function updateSession(request) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Refresh session if expired
    const { data: { user } } = await supabase.auth.getUser()

    const isPublicRoute = request.nextUrl.pathname.startsWith('/login')
    const isMFARoute = request.nextUrl.pathname.startsWith('/mfa')

    // Protect all non-login routes
    if (!user && !isPublicRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    if (user && !isMFARoute) {
        const { data: mfa } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (mfa) {
            // If a user is not fully verified with their Google Authenticator app,
            // force them into the MFA screen to enroll or challenge
            if (mfa.currentLevel !== 'aal2') {
                const url = request.nextUrl.clone()
                url.pathname = '/mfa'
                return NextResponse.redirect(url)
            }
        }
    }

    return supabaseResponse
}

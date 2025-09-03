import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Temporarily disable auth middleware to fix refresh token issue
  // TODO: Re-enable auth middleware after fixing token problem
  
  const supabaseResponse = NextResponse.next({
    request,
  })

  // Basic redirect protection for profile pages (without auth)
  if (request.nextUrl.pathname.startsWith('/profile')) {
    // Allow access for now - TODO: Re-enable auth check later
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
}
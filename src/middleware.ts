import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Redirect favicon.ico to favicon.png to avoid 500 errors
  if (request.nextUrl.pathname === '/favicon.ico') {
    return NextResponse.redirect(new URL('/favicon.png', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/favicon.ico'
}

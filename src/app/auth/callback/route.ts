import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    })
    
    if (error) {
      console.error('Error verifying email:', error)
      return NextResponse.redirect(`${requestUrl.origin}?error=verification_error`)
    }
  }

  // Redirect to home page after successful email verification
  return NextResponse.redirect(requestUrl.origin)
}

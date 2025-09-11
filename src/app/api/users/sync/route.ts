import { NextRequest, NextResponse } from 'next/server'
import { syncUserToDatabase } from '@/lib/userSync'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Get the current user from Supabase auth
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    // Create a new Supabase client with the user's token for server-side use
    const token = authHeader.replace('Bearer ', '')
    
    // Create a server-side Supabase client with the user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    )

    // Get the user data
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      console.error('Error getting user from session:', error)
      return NextResponse.json({ error: 'Invalid session or user not found' }, { status: 401 })
    }

    // Sync the user to our database
    console.log('🔄 Server-side user sync for:', user.email)
    const syncedUser = await syncUserToDatabase(user)

    if (!syncedUser) {
      return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: syncedUser.id,
        email: syncedUser.email,
        name: syncedUser.name,
        role: syncedUser.role
      }
    })

  } catch (error) {
    console.error('Error in user sync API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

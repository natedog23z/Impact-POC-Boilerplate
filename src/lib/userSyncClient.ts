/**
 * Client-side user sync utilities
 * These functions call server-side APIs to handle user syncing
 */

import { supabase } from './supabase'

/**
 * Sync the current authenticated user to the database via API call
 */
export async function syncCurrentUser() {
  try {
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      console.warn('No active session - cannot sync user')
      return null
    }

    console.log('🔄 Calling server-side user sync API...')
    
    // Call our server-side sync API
    const response = await fetch('/api/users/sync', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ User sync API failed:', errorData)
      return null
    }

    const result = await response.json()
    console.log('✅ User synced successfully:', result.user)
    return result.user

  } catch (error) {
    console.error('❌ Error calling user sync API:', error)
    return null
  }
}

/**
 * Get current user data from our database via API
 */
export async function getCurrentUserData() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      return null
    }

    const response = await fetch('/api/users/me', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    })

    if (!response.ok) {
      return null
    }

    const result = await response.json()
    return result.user

  } catch (error) {
    console.error('Error getting user data:', error)
    return null
  }
}

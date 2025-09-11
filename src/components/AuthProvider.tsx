'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { syncCurrentUser } from '@/lib/userSyncClient'

interface AuthContextType {
  user: any
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {}
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // Failsafe timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (mounted) {
        setLoading(false)
      }
    }, 10000) // 10 second timeout

    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (mounted) {
          const authUser = session?.user ?? null
          setUser(authUser)
          
          // Sync existing user to database if they're already logged in
          if (authUser) {
            // Don't await sync to prevent blocking the auth flow
            syncCurrentUser().catch(error => {
              console.error('❌ Error syncing existing user to database:', error)
            })
          }
          
          clearTimeout(loadingTimeout)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error getting session:', error)
        if (mounted) {
          clearTimeout(loadingTimeout)
          setLoading(false)
        }
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        const authUser = session?.user ?? null
        setUser(authUser)
        
        // Sync user to database when they sign in or sign up
        if (authUser && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          // Don't await sync to prevent blocking the auth flow
          syncCurrentUser().catch(error => {
            console.error('Error syncing user to database:', error)
          })
        }
        
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      clearTimeout(loadingTimeout)
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
      }
    } catch (error) {
      console.error('Unexpected error during sign out:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

'use client'

import { Flex, Box, Spinner } from "@radix-ui/themes"
import { Sidebar } from "@/components/Sidebar"
import { useAuth } from "@/components/AuthProvider"
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  
  const isAuthPage = pathname === '/auth'
  const showSidebar = !isAuthPage && user

  // Handle redirects in one place to avoid conflicts
  useEffect(() => {
    if (loading) return // Wait for auth state to be determined

    // Redirect logic
    if (!user && !isAuthPage) {
      router.replace('/auth')
      return
    }
    
    if (user && isAuthPage) {
      router.replace('/')
      return
    }
  }, [user, loading, isAuthPage, router])

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Box style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: 'var(--color-background)'
      }}>
        <Spinner size="3" />
      </Box>
    )
  }

  // Auth page - full width, no sidebar
  if (isAuthPage) {
    // Only show auth page if user is not authenticated
    if (user) {
      return (
        <Box style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: 'var(--color-background)'
        }}>
          <Spinner size="3" />
        </Box>
      )
    }
    
    return (
      <Box style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
        {children}
      </Box>
    )
  }

  // Authenticated pages - show with sidebar
  if (showSidebar) {
    return (
      <Flex>
        <Sidebar />
        <Box style={{ 
          flex: 1, 
          overflow: 'auto', 
          minHeight: '100vh', 
          backgroundColor: 'var(--color-background)', 
          position: 'relative', 
          zIndex: 1,
          marginLeft: '304px' // Account for sidebar width + margin
        }}>
          {children}
        </Box>
      </Flex>
    )
  }

  // Fallback for unauthenticated users on non-auth pages
  return (
    <Box style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: 'var(--color-background)'
    }}>
      <Spinner size="3" />
    </Box>
  )
}

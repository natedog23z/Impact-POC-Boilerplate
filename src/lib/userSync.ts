import { prisma } from './db'

export interface SupabaseUser {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
    [key: string]: any
  }
}

/**
 * Syncs a Supabase auth user to our custom users table
 * Creates new user or updates existing user data
 */
export async function syncUserToDatabase(authUser: SupabaseUser) {
  console.log('🔍 syncUserToDatabase called with:', { 
    id: authUser.id, 
    email: authUser.email, 
    metadata: authUser.user_metadata 
  })

  if (!authUser.email) {
    console.warn('❌ Cannot sync user without email:', authUser.id)
    return null
  }

  try {
    console.log('🔄 Attempting to upsert user to database...')
    const user = await prisma.user.upsert({
      where: { 
        id: authUser.id 
      },
      create: {
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.full_name || null,
        role: 'USER', // Default role for new users
      },
      update: {
        email: authUser.email,
        name: authUser.user_metadata?.full_name || null,
        // Don't update role on sync - preserve existing role
      }
    })

    console.log('✅ User synced successfully:', { 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      role: user.role 
    })
    return user
  } catch (error) {
    console.error('❌ Error syncing user to database:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    return null
  }
}

/**
 * Gets user data from our custom table by Supabase auth ID
 */
export async function getUserFromDatabase(authUserId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: authUserId }
    })
    return user
  } catch (error) {
    console.error('Error fetching user from database:', error)
    return null
  }
}

/**
 * Updates user role (admin functionality)
 */
export async function updateUserRole(authUserId: string, role: 'ADMIN' | 'USER') {
  try {
    const user = await prisma.user.update({
      where: { id: authUserId },
      data: { role }
    })
    console.log(`User role updated: ${user.email} -> ${role}`)
    return user
  } catch (error) {
    console.error('Error updating user role:', error)
    return null
  }
}

// Re-export prisma for convenience
export { prisma }

'use client'

import { Flex, Text, Link, Box, Button, DropdownMenu, Avatar } from "@radix-ui/themes";
import { House } from "@phosphor-icons/react/dist/ssr/House";
import { Database } from "@phosphor-icons/react/dist/ssr/Database";
import { MagicWand } from "@phosphor-icons/react/dist/ssr/MagicWand";
import { SignOut } from "@phosphor-icons/react/dist/ssr/SignOut";
import { User } from "@phosphor-icons/react/dist/ssr/User";
import { UserGear } from "@phosphor-icons/react/dist/ssr/UserGear";
import { CaretDown } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { useAuth } from "@/components/AuthProvider";
import { ThemeLogo } from "@/components/ThemeLogo";
import { useRouter } from 'next/navigation';
import { useUserProfile } from "@/hooks/useUserProfile";

export function Sidebar() {
  const { user, signOut, loading } = useAuth();
  const { profile } = useUserProfile();
  const router = useRouter();

  const handleSignOut = async () => {
    console.log('Sign out button clicked!')
    try {
      await signOut()
    } catch (error) {
      console.error('Error in handleSignOut:', error)
    }
  }

  const handleProfile = () => {
    router.push('/profile')
  }

  return (
    <Box 
      style={{ 
        width: 256, 
        margin: 24,
        height: 'calc(100vh - 48px)', 
        backgroundColor: 'var(--color-panel)', 
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 8,
        boxShadow: 'var(--shadow-5)',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 1000,
      }}
    >
      {/* Logo */}
      <Box style={{ padding: 24, }}>
        <ThemeLogo
          width={140}
          height={33}
          style={{ height: 32, width: 'auto' }}
        />
      </Box>

      {/* Navigation */}
      <Box style={{ flex: 1, padding: 16 }}>
        <Flex direction="column" gap="2">
          {/* Home */}
          <Link href="/">
            <Box
              style={{
                padding: 12,
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              className="nav-item"
            >
              <Flex align="center" gap="3">
                <Box style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <House size={20} color="var(--gray-12)" />
                </Box>
                <Text size="3" weight="medium" style={{
                  color: 'var(--gray-12)',
                  fontFamily: 'F37Jan',
                  fontSize: 16,
                  fontWeight: 400,
                  lineHeight: '24px',
                }}>
                  Dashboard
                </Text>
              </Flex>
            </Box>
          </Link>


          {/* Supabase Studio */}
          <Link href="http://localhost:54323" target="_blank">
            <Box
              style={{
                padding: 12,
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              className="nav-item"
            >
              <Flex align="center" gap="3">
                <Box style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Database size={20} color="var(--gray-12)" />
                </Box>
                <Text size="3" weight="medium" style={{
                  color: 'var(--gray-12)',
                  fontFamily: 'F37Jan',
                  fontSize: 16,
                  fontWeight: 400,
                  lineHeight: '24px',
                }}>
                  Supabase Studio
                </Text>
              </Flex>
            </Box>
          </Link>

          {/** Impact Reports removed per request */}

          {/* Mock Sessions tool */}
          <Link href="/tools/mock-sessions">
            <Box
              style={{
                padding: 12,
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              className="nav-item"
            >
              <Flex align="center" gap="3">
                <Box style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MagicWand size={20} color="var(--gray-12)" />
                </Box>
                <Text size="3" weight="medium" style={{
                  color: 'var(--gray-12)',
                  fontFamily: 'F37Jan',
                  fontSize: 16,
                  fontWeight: 400,
                  lineHeight: '24px',
                }}>
                  Mock Sessions
                </Text>
              </Flex>
            </Box>
          </Link>

        </Flex>
      </Box>

      {/* Authentication Section */}
      <Box style={{ padding: 16, borderTop: '1px solid var(--gray-6)' }}>
        {user && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Button 
                variant="ghost" 
                size="2" 
                style={{ 
                  width: '100%',
                  justifyContent: 'space-between',
                  padding: 8,
                  cursor: 'pointer',
                }}
              >
                <Flex align="center" gap="3">
                  <Avatar
                    src={profile?.avatar || undefined}
                    fallback={(profile?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                    size="2"
                    style={{ flexShrink: 0 }}
                  />
                  <Flex direction="column" gap="1" style={{ textAlign: 'left' }}>
                    <Text size="2" weight="medium" style={{ color: 'var(--gray-12)' }}>
                      {profile?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                    </Text>
                    <Text size="1" color="gray">
                      {user.email}
                    </Text>
                  </Flex>
                </Flex>
                <CaretDown size={12} color="var(--gray-11)" />
              </Button>
            </DropdownMenu.Trigger>
            
            <DropdownMenu.Content size="2" style={{ minWidth: 200 }}>
              <DropdownMenu.Item onClick={handleProfile}>
                <Flex align="center" gap="2">
                  <UserGear size={16} />
                  <Text>Profile Settings</Text>
                </Flex>
              </DropdownMenu.Item>
              
              <DropdownMenu.Separator />
              
              <DropdownMenu.Item 
                onClick={handleSignOut}
                disabled={loading}
                color="red"
              >
                <Flex align="center" gap="2">
                  <SignOut size={16} />
                  <Text>{loading ? 'Signing Out...' : 'Sign Out'}</Text>
                </Flex>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        )}
      </Box>
    </Box>
  );
}

'use client'

import { Flex, Text, Box, Button } from "@radix-ui/themes"
import { useState } from "react"
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { sendCustomSignupConfirmation } from '@/lib/auth-config'
import { ThemeLogo } from '@/components/ThemeLogo'
import BorderedCard from '@/components/BorderedCard'

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    if (isSignUp && !name.trim()) {
      setMessage('Please enter your full name')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name.trim()
            }
          }
        })
        if (error) {
          setMessage(error.message)
        } else {
          setMessage('Check your email for a confirmation link!')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) {
          setMessage(error.message)
        } else {
          router.push('/')
        }
      }
    } catch (error) {
      setMessage('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Left Side - Form */}
      <Box style={{ 
        flex: '1',
        maxWidth: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px'
      }}>
        <Box style={{ width: '100%', maxWidth: '400px' }}>
          <form onSubmit={handleAuthSubmit}>
            <Flex direction="column" gap="6">
              {/* Logo */}
              <Box style={{ textAlign: 'left', marginBottom: '16px' }}>
                <ThemeLogo
                  width={140}
                  height={33}
                  style={{ height: 'auto', width: 'auto' }}
                />
              </Box>
              
              {/* Header */}
              <Box>
                <Text size="7" weight="bold" style={{ 
                  color: 'var(--gray-12)',
                  marginBottom: '8px',
                  display: 'block'
                }}>
                  {isSignUp ? 'Create your account' : 'Welcome back'}
                </Text>
                <Text size="3" color="gray">
                  {isSignUp 
                    ? 'Join us to get started with your workflow builder' 
                    : 'Sign in to continue to your dashboard'
                  }
                </Text>
              </Box>
              
              {/* Message */}
              {message && (
                <BorderedCard style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: message.includes('error') || message.includes('Invalid') ? 'var(--red-2)' : 'var(--blue-2)',
                  border: `1px solid ${message.includes('error') || message.includes('Invalid') ? 'var(--red-6)' : 'var(--blue-6)'}`
                }}>
                  <Text size="2" style={{
                    color: message.includes('error') || message.includes('Invalid') ? 'var(--red-11)' : 'var(--blue-11)'
                  }}>
                    {message}
                  </Text>
                </BorderedCard>
              )}
              
              {/* Name Input - Only for Sign Up */}
              {isSignUp && (
                <Box>
                  <Text size="2" weight="medium" style={{ 
                    color: 'var(--gray-11)', 
                    marginBottom: '8px',
                    display: 'block'
                  }}>
                    Full Name
                  </Text>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={isSignUp}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--gray-6)',
                      fontSize: '16px',
                      fontFamily: 'inherit',
                      backgroundColor: loading ? 'var(--gray-2)' : 'var(--color-panel)',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      if (!loading) {
                        (e.target as HTMLElement).style.borderColor = 'var(--accent-9)';
                        (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
                      }
                    }}
                    onBlur={(e) => {
                      (e.target as HTMLElement).style.borderColor = 'var(--gray-6)';
                      (e.target as HTMLElement).style.boxShadow = 'none'
                    }}
                  />
                </Box>
              )}
              
              {/* Email Input */}
              <Box>
                <Text size="2" weight="medium" style={{ 
                  color: 'var(--gray-11)', 
                  marginBottom: '8px',
                  display: 'block'
                }}>
                  Email address
                </Text>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--gray-6)',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                    backgroundColor: loading ? 'var(--gray-2)' : 'var(--color-panel)',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    if (!loading) {
                      e.target.style.borderColor = 'var(--accent-9)'
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--gray-6)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </Box>
              
              {/* Password Input */}
              <Box>
                <Text size="2" weight="medium" style={{ 
                  color: 'var(--gray-11)', 
                  marginBottom: '8px',
                  display: 'block'
                }}>
                  Password
                </Text>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--gray-6)',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                    backgroundColor: loading ? 'var(--gray-2)' : 'var(--color-panel)',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    if (!loading) {
                      e.target.style.borderColor = 'var(--accent-9)'
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--gray-6)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </Box>
              
              {/* Submit Button */}
              <Button 
                type="submit" 
                size="3"
                disabled={loading}
                style={{ 
                  width: '100%',
                  backgroundColor: loading ? 'var(--gray-8)' : 'var(--accent-9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s',
                  marginTop: '8px'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    (e.target as HTMLElement).style.backgroundColor = 'var(--accent-10)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    (e.target as HTMLElement).style.backgroundColor = 'var(--accent-9)'
                  }
                }}
              >
                {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
              </Button>
              
              {/* Toggle Sign In/Up */}
              <Box style={{ textAlign: 'center', marginTop: '16px' }}>
                <Text size="2" color="gray" style={{ display: 'inline' }}>
                  {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                </Text>
                <Button 
                  type="button"
                  variant="ghost" 
                  size="2"
                  onClick={() => {
                    setIsSignUp(!isSignUp)
                    setMessage('')
                  }}
                  disabled={loading}
                  style={{ 
                    color: 'var(--accent-9)',
                    textDecoration: 'none',
                    fontWeight: '500',
                    padding: '0',
                    height: 'auto',
                    minHeight: 'auto',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'inline',
                    verticalAlign: 'baseline',
                    background: 'none',
                    marginLeft: '8px',
                    border: 'none'
                  }}
                >
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Button>
              </Box>
            </Flex>
          </form>
        </Box>
      </Box>

      {/* Right Side - Value Props */}
      <Box style={{ 
        flex: '1',
        backgroundColor: 'var(--color-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '48px',
        padding: '48px',
        borderRadius: '24px',
        position: 'relative'
      }}>
        <Box style={{ maxWidth: '500px', color: 'white' }}>
          <Flex direction="column" gap="8">
            {/* Main Heading */}
            <Box>
              <Text size="8" weight="bold" style={{ 
                color: 'var(--gray-12)',
                lineHeight: '1.2',
                marginBottom: '16px',
                display: 'block'
              }}>
                Maximizing Philanthropy with Precision & Transparency
              </Text>
              <Text size="4" style={{ 
                color: 'var(--gray-9)',
                lineHeight: '1.6'
              }}>
                Impact is a growing suite of tools designed to help donors orchestrate and see the outcomes 
                of their giving. We provide payment rails, outcome reporting tools, & AI powered 
                impact dashboards to donors and the organizations they support.
              </Text>
            </Box>

            {/* Feature List */}
            <Flex direction="column" gap="4">
              <Flex align="center" gap="3">
                <Box style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Text size="1" weight="bold" style={{ color: 'white' }}>✓</Text>
                </Box>
                <Text size="3" style={{ color: 'var(--gray-11)' }}>
                  Drag-and-drop workflow builder
                </Text>
              </Flex>

              <Flex align="center" gap="3">
                <Box style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Text size="1" weight="bold" style={{ color: 'white' }}>✓</Text>
                </Box>
                <Text size="3" style={{ color: 'var(--gray-11)' }}>
                  Real-time collaboration and sharing
                </Text>
              </Flex>

              <Flex align="center" gap="3">
                <Box style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Text size="1" weight="bold" style={{ color: 'white' }}>✓</Text>
                </Box>
                <Text size="3" style={{ color: 'var(--gray-11)' }}>
                  Advanced analytics and reporting
                </Text>
              </Flex>

              <Flex align="center" gap="3">
                <Box style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Text size="1" weight="bold" style={{ color: 'white' }}>✓</Text>
                </Box>
                <Text size="3" style={{ color: 'var(--gray-11)' }}>
                  Enterprise-grade security
                </Text>
              </Flex>
            </Flex>

            {/* Testimonial */}
            <Box style={{
              padding: '24px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              marginTop: '32px'
            }}>
              <Text size="3" style={{ 
                color: 'var(--gray-11)',
                fontStyle: 'italic',
                marginBottom: '16px',
                display: 'block'
              }}>
                "This platform transformed how we manage our processes. Setup was incredibly easy and we saw results immediately."
              </Text>
              <Text size="2" weight="medium" style={{ color: 'var(--gray-9)' }}>
                — Sarah Chen, Operations Director
              </Text>
            </Box>
          </Flex>
        </Box>
      </Box>
    </Box>
  )
}

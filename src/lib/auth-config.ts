// Custom auth configuration with email templates
import { supabase } from './supabase'

// Function to send password reset with custom template
export const sendCustomPasswordReset = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })
  
  return { data, error }
}

// Function to send signup confirmation with custom template
export const sendCustomSignupConfirmation = async (email: string, password: string, userData: any = {}) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        full_name: userData.full_name,
        company: 'Gloo Impact',
        welcome_message: 'Welcome to the future of impact measurement!'
      }
    }
  })
  
  return { data, error }
}

// Email template configuration
export const emailTemplateConfig = {
  // Colors that match your brand
  brandColors: {
    primary: '#3b82f6',      // Blue
    success: '#10b981',      // Green  
    warning: '#f59e0b',      // Orange
    error: '#ef4444',        // Red
    text: '#1a202c',         // Dark gray
    muted: '#64748b',        // Light gray
    background: '#f8fafc'    // Very light gray
  },
  
  // Company info
  company: {
    name: 'Gloo Impact',
    logo: `${window.location.origin}/images/gloo-impact-logo-light.svg`,
    supportEmail: 'support@glooimpact.com',
    website: 'https://glooimpact.com'
  },
  
  // Custom redirect URLs
  redirects: {
    confirmSignup: '/dashboard',
    resetPassword: '/auth/reset-password', 
    magicLink: '/dashboard',
    emailChange: '/profile'
  }
}

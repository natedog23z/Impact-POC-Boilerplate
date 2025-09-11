// Example email template customization for Supabase Auth
// These would be set in your Supabase Dashboard under Authentication > Templates

export const emailTemplates = {
  // Email Confirmation Template
  confirmSignup: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirm Your Email - Gloo Impact</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8fafc;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 40px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        .logo {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo h1 {
          color: #1a202c;
          font-size: 28px;
          font-weight: 600;
          margin: 0;
        }
        .button {
          display: inline-block;
          background: #3b82f6;
          color: white;
          padding: 14px 32px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 500;
          margin: 20px 0;
          text-align: center;
        }
        .button:hover {
          background: #2563eb;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <h1>Gloo Impact</h1>
        </div>
        
        <h2>Welcome to Gloo Impact! 🎉</h2>
        
        <p>Thanks for signing up! We're excited to have you on board.</p>
        
        <p>To get started, please confirm your email address by clicking the button below:</p>
        
        <div style="text-align: center;">
          <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup&redirect_to={{ .RedirectTo }}" 
             class="button">
            Confirm Email Address
          </a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #3b82f6;">
          {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup&redirect_to={{ .RedirectTo }}
        </p>
        
        <p>This link will expire in 24 hours for security reasons.</p>
        
        <div class="footer">
          <p>If you didn't create an account with us, you can safely ignore this email.</p>
          <p>© 2025 Gloo Impact. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Password Reset Template  
  resetPassword: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password - Gloo Impact</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8fafc;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 40px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        .logo {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo h1 {
          color: #1a202c;
          font-size: 28px;
          font-weight: 600;
          margin: 0;
        }
        .button {
          display: inline-block;
          background: #ef4444;
          color: white;
          padding: 14px 32px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 500;
          margin: 20px 0;
          text-align: center;
        }
        .button:hover {
          background: #dc2626;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 14px;
        }
        .warning {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 8px;
          padding: 16px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <h1>Gloo Impact</h1>
        </div>
        
        <h2>Reset Your Password 🔐</h2>
        
        <p>We received a request to reset the password for your account ({{ .Email }}).</p>
        
        <p>Click the button below to create a new password:</p>
        
        <div style="text-align: center;">
          <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&redirect_to={{ .RedirectTo }}" 
             class="button">
            Reset Password
          </a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #ef4444;">
          {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&redirect_to={{ .RedirectTo }}
        </p>
        
        <div class="warning">
          <strong>⚠️ Security Notice:</strong>
          <ul>
            <li>This link will expire in 1 hour</li>
            <li>If you didn't request this reset, please ignore this email</li>
            <li>Your password will remain unchanged until you create a new one</li>
          </ul>
        </div>
        
        <div class="footer">
          <p>If you're having trouble, contact our support team.</p>
          <p>© 2025 Gloo Impact. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Magic Link Template
  magicLink: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Magic Link - Gloo Impact</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8fafc;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 40px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        .logo {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo h1 {
          color: #1a202c;
          font-size: 28px;
          font-weight: 600;
          margin: 0;
        }
        .button {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 14px 32px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 500;
          margin: 20px 0;
          text-align: center;
        }
        .button:hover {
          background: #059669;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <h1>Gloo Impact</h1>
        </div>
        
        <h2>Your Magic Link ✨</h2>
        
        <p>Click the button below to sign in to your Gloo Impact account:</p>
        
        <div style="text-align: center;">
          <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink&redirect_to={{ .RedirectTo }}" 
             class="button">
            Sign In to Gloo Impact
          </a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #10b981;">
          {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink&redirect_to={{ .RedirectTo }}
        </p>
        
        <p><strong>This link will expire in 1 hour</strong> for security reasons.</p>
        
        <div class="footer">
          <p>If you didn't request this sign-in link, you can safely ignore this email.</p>
          <p>© 2025 Gloo Impact. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Custom email configuration options
export const emailConfig = {
  // Custom SMTP settings (optional - Supabase uses their own by default)
  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: 'Gloo Impact <noreply@glooimpact.com>'
  },
  
  // Brand colors
  colors: {
    primary: '#3b82f6',
    success: '#10b981', 
    warning: '#f59e0b',
    error: '#ef4444',
    text: '#1a202c',
    muted: '#64748b'
  }
}

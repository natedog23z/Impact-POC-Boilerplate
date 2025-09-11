'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { Box, Text, Flex } from '@radix-ui/themes'
import { CheckCircle } from '@phosphor-icons/react/dist/ssr/CheckCircle'
import { XCircle } from '@phosphor-icons/react/dist/ssr/XCircle'
import { Info } from '@phosphor-icons/react/dist/ssr/Info'
import { Warning } from '@phosphor-icons/react/dist/ssr/Warning'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  removeToast: () => {},
})

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

const ToastIcon = ({ type }: { type: ToastType }) => {
  const iconProps = { size: 20 }
  
  switch (type) {
    case 'success':
      return <CheckCircle {...iconProps} color="var(--green-11)" />
    case 'error':
      return <XCircle {...iconProps} color="var(--red-11)" />
    case 'warning':
      return <Warning {...iconProps} color="var(--orange-11)" />
    case 'info':
    default:
      return <Info {...iconProps} color="var(--blue-11)" />
  }
}

const ToastItem = ({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) => {
  const getToastStyles = (type: ToastType) => {
    const baseStyles = {
      backgroundColor: 'var(--color-panel)',
      border: '1px solid',
      borderRadius: '16px',
      padding: '16px 20px',
      minWidth: '320px',
      maxWidth: '480px',
      boxShadow: 'var(--shadow-6)',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      position: 'relative' as const,
      overflow: 'hidden' as const,
    }

    switch (type) {
      case 'success':
        return {
          ...baseStyles,
          borderColor: 'var(--green-6)',
          '&::before': {
            content: '""',
            position: 'absolute' as const,
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            backgroundColor: 'var(--green-9)',
          }
        }
      case 'error':
        return {
          ...baseStyles,
          borderColor: 'var(--red-6)',
          '&::before': {
            content: '""',
            position: 'absolute' as const,
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            backgroundColor: 'var(--red-9)',
          }
        }
      case 'warning':
        return {
          ...baseStyles,
          borderColor: 'var(--orange-6)',
          '&::before': {
            content: '""',
            position: 'absolute' as const,
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            backgroundColor: 'var(--orange-9)',
          }
        }
      case 'info':
      default:
        return {
          ...baseStyles,
          borderColor: 'var(--blue-6)',
          '&::before': {
            content: '""',
            position: 'absolute' as const,
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            backgroundColor: 'var(--blue-9)',
          }
        }
    }
  }

  return (
    <Box
      style={{
        ...getToastStyles(toast.type),
        animation: 'toast-slide-up 0.3s ease-out',
        marginBottom: '12px',
      }}
      onClick={() => onRemove(toast.id)}
    >
      {/* Left border indicator */}
      <Box
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '4px',
          backgroundColor: 
            toast.type === 'success' ? 'var(--green-9)' :
            toast.type === 'error' ? 'var(--red-9)' :
            toast.type === 'warning' ? 'var(--orange-9)' :
            'var(--blue-9)',
        }}
      />
      
      <Flex align="start" gap="3" style={{ paddingLeft: '8px' }}>
        <Box style={{ flexShrink: 0, marginTop: '2px' }}>
          <ToastIcon type={toast.type} />
        </Box>
        
        <Box style={{ flex: 1 }}>
          <Text size="3" weight="medium" style={{ 
            color: 'var(--gray-12)',
            display: 'block',
            marginBottom: toast.description ? '4px' : '0'
          }}>
            {toast.title}
          </Text>
          
          {toast.description && (
            <Text size="2" style={{ 
              color: 'var(--gray-11)',
              lineHeight: '1.4'
            }}>
              {toast.description}
            </Text>
          )}
        </Box>
      </Flex>
    </Box>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
    }

    setToasts(prev => [...prev, newToast])

    // Auto-remove after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      
      {/* Toast Container */}
      {toasts.length > 0 && (
        <Box
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10000,
            pointerEvents: 'none',
          }}
        >
          <Box style={{ pointerEvents: 'auto' }}>
            {toasts.map(toast => (
              <ToastItem
                key={toast.id}
                toast={toast}
                onRemove={removeToast}
              />
            ))}
          </Box>
        </Box>
      )}
      
      {/* Toast Animation Styles */}
      <style jsx global>{`
        @keyframes toast-slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes toast-slide-out {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(-20px);
          }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

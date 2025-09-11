import { ToastType } from '@/components/ToastProvider'

// Toast helper functions for common use cases
export const createToast = {
  success: (title: string, description?: string, duration?: number) => ({
    type: 'success' as ToastType,
    title,
    description,
    duration
  }),
  
  error: (title: string, description?: string, duration?: number) => ({
    type: 'error' as ToastType,
    title,
    description,
    duration
  }),
  
  info: (title: string, description?: string, duration?: number) => ({
    type: 'info' as ToastType,
    title,
    description,
    duration
  }),
  
  warning: (title: string, description?: string, duration?: number) => ({
    type: 'warning' as ToastType,
    title,
    description,
    duration
  })
}

// Common toast messages
export const commonToasts = {
  // Success messages
  saved: () => createToast.success('Saved!', 'Your changes have been saved successfully.'),
  updated: () => createToast.success('Updated!', 'Your information has been updated.'),
  deleted: () => createToast.success('Deleted!', 'The item has been removed.'),
  created: () => createToast.success('Created!', 'New item has been created successfully.'),
  
  // Error messages
  saveFailed: () => createToast.error('Save failed', 'Unable to save your changes. Please try again.'),
  loadFailed: () => createToast.error('Load failed', 'Unable to load data. Please refresh the page.'),
  networkError: () => createToast.error('Network error', 'Please check your connection and try again.'),
  unauthorized: () => createToast.error('Access denied', 'You do not have permission to perform this action.'),
  
  // Info messages
  processing: () => createToast.info('Processing...', 'Your request is being processed.'),
  emailSent: () => createToast.info('Email sent!', 'Please check your inbox for further instructions.'),
  
  // Warning messages
  unsavedChanges: () => createToast.warning('Unsaved changes', 'You have unsaved changes that will be lost.'),
  confirmDelete: () => createToast.warning('Confirm deletion', 'This action cannot be undone.')
}

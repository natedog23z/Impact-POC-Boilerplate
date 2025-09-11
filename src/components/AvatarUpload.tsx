'use client';

import { useState, useRef } from 'react';
import { Box, Button, Flex, Text, Avatar } from '@radix-ui/themes';
import { Camera, Upload, X, Check } from '@phosphor-icons/react';
import { uploadFile, validateFile, UploadResult } from '@/lib/storage';

interface AvatarUploadProps {
  currentAvatar?: string | null;
  userName?: string;
  onUploadComplete?: (avatarUrl: string) => void;
  onUploadStart?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export function AvatarUpload({
  currentAvatar,
  userName = 'User',
  onUploadComplete,
  onUploadStart,
  size = 'large'
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeConfig = {
    small: { avatar: '2', button: '1' },
    medium: { avatar: '4', button: '2' },
    large: { avatar: '6', button: '3' }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    setError(null);

    // Validate file
    const validation = validateFile(file, {
      maxSize: 2 * 1024 * 1024, // 2MB for avatars
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    });

    if (!validation.valid) {
      setError(validation.error!);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    setIsUploading(true);
    onUploadStart?.();

    try {
      const result = await uploadFile(file, 'uploads', 'avatars');
      
      if (result.success && result.url) {
        onUploadComplete?.(result.url);
        setPreviewUrl(null);
      } else {
        setError(result.error || 'Upload failed');
        setPreviewUrl(null);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const clearError = () => setError(null);

  const displayAvatar = previewUrl || currentAvatar;

  return (
    <Box>
      <Flex direction="column" align="center" gap="3">
        {/* Avatar Display */}
        <Box style={{ position: 'relative' }}>
          <Avatar
            src={displayAvatar || undefined}
            fallback={userName.charAt(0).toUpperCase()}
            size={sizeConfig[size].avatar as any}
            style={{
              cursor: 'pointer',
              border: isUploading ? '3px solid var(--blue-9)' : '2px solid var(--gray-6)',
              transition: 'all 0.2s ease'
            }}
            onClick={handleButtonClick}
          />
          
          {/* Upload overlay */}
          <Flex
            align="center"
            justify="center"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              backgroundColor: isUploading ? 'rgba(59, 130, 246, 0.8)' : 'rgba(0, 0, 0, 0.6)',
              opacity: isUploading ? 1 : 0,
              transition: 'opacity 0.2s ease',
              cursor: 'pointer'
            }}
            className="hover:opacity-100"
            onClick={handleButtonClick}
          >
            {isUploading ? (
              <Box style={{ color: 'white', textAlign: 'center' }}>
                <Upload size={20} weight="duotone" />
                <Text size="1" style={{ display: 'block', marginTop: '4px' }}>
                  {Math.round(uploadProgress)}%
                </Text>
              </Box>
            ) : (
              <Camera size={24} weight="duotone" style={{ color: 'white' }} />
            )}
          </Flex>

          {/* Success indicator */}
          {previewUrl && !isUploading && (
            <Flex
              align="center"
              justify="center"
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: 'var(--green-9)',
                color: 'white'
              }}
            >
              <Check size={12} weight="bold" />
            </Flex>
          )}
        </Box>

        {/* Upload Button */}
        <Button
          variant="soft"
          size={sizeConfig[size].button as any}
          disabled={isUploading}
          onClick={handleButtonClick}
          style={{ cursor: 'pointer' }}
        >
          <Camera size={16} weight="duotone" />
          {isUploading ? 'Uploading...' : 'Change Avatar'}
        </Button>

        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={(e) => handleFileSelect(e.target.files)}
          style={{ display: 'none' }}
        />

        {/* Error Message */}
        {error && (
          <Flex
            align="center"
            justify="between"
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--red-2)',
              border: '1px solid var(--red-6)',
              borderRadius: '6px',
              maxWidth: '280px'
            }}
          >
            <Text size="2" style={{ color: 'var(--red-11)' }}>
              {error}
            </Text>
            <Button variant="ghost" size="1" onClick={clearError}>
              <X size={12} />
            </Button>
          </Flex>
        )}

        {/* Upload Instructions */}
        {size === 'large' && (
          <Text size="1" color="gray" style={{ textAlign: 'center', maxWidth: '200px' }}>
            Click to upload a new avatar. Max size: 2MB
            <br />
            Supported: JPG, PNG, WebP
          </Text>
        )}
      </Flex>
    </Box>
  );
}

'use client';

import { useState, useRef } from 'react';
import { Box, Button, Card, Flex, Text, Progress } from '@radix-ui/themes';
import { CloudArrowUp, Image, X, Check } from '@phosphor-icons/react';
import { uploadFile, validateFile, UploadResult } from '@/lib/storage';

interface FileUploadProps {
  onUploadComplete?: (result: UploadResult) => void;
  onUploadStart?: () => void;
  bucket?: string;
  folder?: string;
  maxSize?: number;
  allowedTypes?: string[];
  multiple?: boolean;
  showPreview?: boolean;
  className?: string;
}

export function FileUpload({
  onUploadComplete,
  onUploadStart,
  bucket = 'uploads',
  folder = 'images',
  maxSize = 5 * 1024 * 1024, // 5MB
  allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  multiple = false,
  showPreview = true,
  className = ''
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError(null);
    const fileArray = Array.from(files);

    // Validate files
    for (const file of fileArray) {
      const validation = validateFile(file, { maxSize, allowedTypes });
      if (!validation.valid) {
        setError(validation.error!);
        return;
      }
    }

    // Upload files
    setIsUploading(true);
    onUploadStart?.();

    try {
      const uploadPromises = fileArray.map(async (file, index) => {
        setUploadProgress((index / fileArray.length) * 100);
        return await uploadFile(file, bucket, folder);
      });

      const results = await Promise.all(uploadPromises);
      setUploadProgress(100);

      const successfulUploads = results.filter(result => result.success);
      setUploadedFiles(prev => [...prev, ...successfulUploads]);

      // Call completion callback for each successful upload
      results.forEach(result => {
        if (result.success) {
          onUploadComplete?.(result);
        } else {
          setError(result.error || 'Upload failed');
        }
      });

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearError = () => setError(null);

  return (
    <Box className={className}>
      {/* Upload Area */}
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Flex direction="column" align="center" justify="center" gap="3" className="p-8">
          <CloudArrowUp 
            size={48} 
            weight="duotone" 
            className={isDragging ? 'text-blue-500' : 'text-gray-400'} 
          />
          
          <Flex direction="column" align="center" gap="1">
            <Text size="4" weight="medium">
              {isDragging ? 'Drop files here' : 'Upload files'}
            </Text>
            <Text size="2" color="gray">
              Drag and drop or click to select {multiple ? 'files' : 'a file'}
            </Text>
            <Text size="1" color="gray">
              Max size: {Math.round(maxSize / 1024 / 1024)}MB
            </Text>
          </Flex>

          {isUploading && (
            <Box className="w-full max-w-xs">
              <Progress value={uploadProgress} className="w-full" />
              <Text size="1" color="gray" className="text-center mt-1">
                Uploading... {Math.round(uploadProgress)}%
              </Text>
            </Box>
          )}
        </Flex>
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={allowedTypes.join(',')}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Error message */}
      {error && (
        <Card className="mt-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
          <Flex align="center" justify="between" className="p-3">
            <Text size="2" color="red">
              {error}
            </Text>
            <Button variant="ghost" size="1" onClick={clearError}>
              <X size={14} />
            </Button>
          </Flex>
        </Card>
      )}

      {/* Preview uploaded files */}
      {showPreview && uploadedFiles.length > 0 && (
        <Box className="mt-4">
          <Text size="3" weight="medium" className="mb-3 block">
            Uploaded Files ({uploadedFiles.length})
          </Text>
          <Flex wrap="wrap" gap="3">
            {uploadedFiles.map((file, index) => (
              <Card key={index} className="relative group">
                <Box className="w-24 h-24 overflow-hidden rounded">
                  {file.url && (
                    <img
                      src={file.url}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </Box>
                
                {/* Success indicator */}
                <Flex
                  align="center"
                  justify="center"
                  className="absolute top-1 right-1 w-6 h-6 bg-green-500 text-white rounded-full"
                >
                  <Check size={12} weight="bold" />
                </Flex>

                {/* Remove button */}
                <Button
                  variant="solid"
                  size="1"
                  color="red"
                  className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeUploadedFile(index)}
                >
                  <X size={12} />
                </Button>
              </Card>
            ))}
          </Flex>
        </Box>
      )}
    </Box>
  );
}

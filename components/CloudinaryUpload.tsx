"use client";

import { useRef, ChangeEvent, useState } from "react";
import toast from "react-hot-toast";

/**
 * CloudinaryUpload Component
 * 
 * Implements UNSIGNED uploads to Cloudinary from the frontend.
 * No API keys or secrets are needed on the client side.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to Cloudinary Dashboard: https://cloudinary.com/console
 * 2. Navigate to Settings → Upload → Upload presets
 * 3. Click "Add upload preset"
 * 4. Set Signing Mode to "Unsigned"
 * 5. Configure your preset settings (folder, transformations, etc.)
 * 6. Save the preset name
 * 7. Add to .env.local:
 *    - NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *    - NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_preset_name
 */

interface CloudinaryUploadProps {
  onUpload: (urls: string[]) => void;
  currentFiles?: string[];
  label?: string;
  acceptAll?: boolean;
  disabled?: boolean;
}

export default function CloudinaryUpload({ 
  onUpload, 
  currentFiles = [], 
  label = "Upload Files", 
  acceptAll = false,
  disabled = false 
}: CloudinaryUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  /**
   * Upload file to Cloudinary using unsigned preset
   * Uses 'auto' resource type to automatically detect file type
   * @param file - File to upload
   * @returns Secure URL of uploaded file or null on error
   */
  const uploadToCloudinary = async (file: File): Promise<string | null> => {
    try {
      // Get environment variables
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      // Validate configuration
      if (!cloudName || !uploadPreset) {
        console.error('❌ Missing Cloudinary configuration:', { cloudName, uploadPreset });
        throw new Error('Cloudinary is not configured. Check environment variables.');
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      // Use 'auto' resource type - automatically detects images, videos, raw files
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
      
      console.log('📤 Cloudinary Upload:', {
        fileName: file.name,
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        fileType: file.type,
        cloudName,
        uploadPreset,
        endpoint: uploadUrl
      });
      
      // Upload to Cloudinary
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      // Handle non-OK responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('❌ Cloudinary Error Response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        const errorMessage = errorData?.error?.message || 
                           errorData?.message || 
                           `Upload failed (${response.status})`;
        throw new Error(errorMessage);
      }

      // Parse success response
      const data = await response.json();
      
      console.log('✅ Upload Successful:', {
        fileName: file.name,
        secure_url: data.secure_url,
        public_id: data.public_id,
        resource_type: data.resource_type
      });

      return data.secure_url;
    } catch (error: any) {
      console.error('❌ Upload Error:', {
        fileName: file.name,
        error: error.message,
        stack: error.stack
      });
      
      // User-friendly error message
      const errorMsg = error.message || `Failed to upload ${file.name}`;
      toast.error(errorMsg);
      
      return null;
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    
    setUploading(true);
    
    // Process all files
    const filePromises = Array.from(files).map(async (file) => {
      // Validate file size
      if (file.size > maxSize) {
        toast.error(`${file.name} is larger than 10MB`);
        return null;
      }

      // Upload to Cloudinary
      const url = await uploadToCloudinary(file);
      return url;
    });

    // Wait for all files to be processed
    const results = await Promise.all(filePromises);
    const validFiles = results.filter((file): file is string => file !== null);
    
    if (validFiles.length > 0) {
      onUpload([...currentFiles, ...validFiles]);
      toast.success(`${validFiles.length} file(s) uploaded successfully!`);
    }
    
    setUploading(false);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleDelete = (index: number) => {
    if (!disabled) {
      const updatedFiles = currentFiles.filter((_, i) => i !== index);
      onUpload(updatedFiles);
    }
  };

  const getFileName = (url: string) => {
    try {
      const parts = url.split('/');
      const filename = parts[parts.length - 1];
      return decodeURIComponent(filename);
    } catch {
      return 'File';
    }
  };

  const isImageUrl = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
  };

  return (
    <div className="space-y-3">
      {/* Files Display */}
      {currentFiles.length > 0 && (
        <div className="space-y-2">
          {currentFiles.map((fileUrl, index) => (
            <div key={index} className="flex items-center gap-3 p-2 bg-gray-800 rounded-lg border border-gray-600">
              {isImageUrl(fileUrl) ? (
                <div className="w-12 h-12 rounded overflow-hidden shrink-0 bg-gray-700">
                  <img
                    src={fileUrl}
                    alt={`Attachment ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded bg-gray-700 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">
                  {getFileName(fileUrl)}
                </p>
                <a 
                  href={fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-orange-400 hover:text-orange-300"
                >
                  View File
                </a>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(index)}
                disabled={disabled}
                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete file"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex justify-center">
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptAll ? "*" : "image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"}
          onChange={handleFileChange}
          multiple
          className="hidden"
          disabled={uploading || disabled}
        />
        <button
          type="button"
          onClick={handleClick}
          disabled={uploading || disabled}
          className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors border border-gray-600 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span>{currentFiles.length > 0 ? 'Add More Files' : label}</span>
            </>
          )}
        </button>
      </div>
      
      <p className="text-xs text-center text-gray-400">
        {acceptAll ? 'Supported: All file types' : 'Supported: Images, PDF'} • Max 10MB each
      </p>
    </div>
  );
}

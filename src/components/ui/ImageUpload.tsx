"use client";

import React, { useState, useRef } from "react";
import { FiUpload, FiX, FiImage, FiLoader } from "react-icons/fi";
import { processImageFile, ImageProcessingOptions } from "@/utils/imageUtils";
import ActionButton from "./ActionButton";

interface ImageUploadProps {
  value?: string; // Base64 image string
  onChange: (base64Image: string | null) => void;
  placeholder?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  disabled?: boolean;
  className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  placeholder = "Κάντε κλικ για να ανεβάσετε εικόνα",
  maxWidth = 800,
  maxHeight = 600,
  quality = 0.8,
  disabled = false,
  className = "",
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processingOptions: ImageProcessingOptions = {
    maxWidth,
    maxHeight,
    quality,
    format: 'webp'
  };

  const handleFileSelect = async (file: File) => {
    if (disabled) return;

    setIsProcessing(true);
    setError(null);

    try {
      const processedImage = await processImageFile(file, processingOptions);
      onChange(processedImage);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Σφάλμα κατά την επεξεργασία της εικόνας';
      setError(errorMessage);
      console.error('Image processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);

    if (disabled || isProcessing) return;

    const files = Array.from(event.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));

    if (imageFile) {
      handleFileSelect(imageFile);
    } else {
      setError('Παρακαλώ ανεβάστε μια έγκυρη εικόνα');
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled && !isProcessing) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleClick = () => {
    if (!disabled && !isProcessing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemove = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!disabled) {
      onChange(null);
      setError(null);
    }
  };

  const hasImage = value && value.length > 0;

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          relative border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer
          ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300'}
          ${hasImage ? 'border-solid border-slate-200' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 hover:bg-slate-50'}
          ${error ? 'border-red-300 bg-red-50' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || isProcessing}
        />

        {hasImage ? (
          // Image Preview
          <div className="relative group">
            <img
              src={value}
              alt="Preview"
              className="w-full h-48 object-cover rounded-xl"
            />
            
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl flex items-center justify-center">
              <div className="flex gap-2">
                <ActionButton
                  onClick={handleClick}
                  icon={FiUpload}
                  variant="secondary"
                  size="sm"
                  disabled={disabled || isProcessing}
                >
                  Αλλαγή
                </ActionButton>
                <ActionButton
                  onClick={() => handleRemove({} as React.MouseEvent)}
                  icon={FiX}
                  variant="danger"
                  size="sm"
                  disabled={disabled}
                >
                  Αφαίρεση
                </ActionButton>
              </div>
            </div>

            {/* Remove button (always visible on mobile) */}
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors md:opacity-0 md:group-hover:opacity-100"
              disabled={disabled}
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        ) : (
          // Upload Area
          <div className="p-8 text-center">
            {isProcessing ? (
              <div className="flex flex-col items-center gap-3">
                <FiLoader className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-sm text-slate-600">Επεξεργασία εικόνας...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                  <FiImage className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">{placeholder}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Υποστηρίζονται: JPG, PNG, GIF (μέγιστο 10MB)
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Αυτόματη μετατροπή σε WebP {maxWidth}x{maxHeight}px
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 flex items-center gap-2">
            <FiX className="w-4 h-4" />
            {error}
          </p>
        </div>
      )}

      {/* Processing Info */}
      {hasImage && !error && (
        <div className="mt-2 text-xs text-slate-500">
          Εικόνα WebP • Βελτιστοποιημένη για web
        </div>
      )}
    </div>
  );
};

export default ImageUpload;

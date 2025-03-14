"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageMetadata } from "@/components/image-metadata";
import { ImageCropper } from "@/components/image-cropper";
import { preprocessImage } from "@/lib/metadata";
import { FileText, Upload, Crop, Download, RefreshCw, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { saveImageWithMetadata } from "@/lib/metadata/save-with-metadata";

export function ImageProcessor() {
  // Core state
  const [image, setImage] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null);
  const [workingMetadata, setWorkingMetadata] = useState<Record<string, unknown> | null>(null);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [croppedCanvas, setCroppedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [pendingChanges, setPendingChanges] = useState(false);
  const [processingDownload, setProcessingDownload] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Process uploaded image
  const processImage = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setCroppedCanvas(null);
    setPendingChanges(false);
    
    try {
      const result = await preprocessImage(file);
      setImage(result.objectUrl);
      setMetadata(result.meta);
      setWorkingMetadata(result.meta);
      setOriginalFile(file);
    } catch (err) {
      console.error("Error processing image:", err);
      setError("Failed to extract metadata from image.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle file select from input
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }
    
    await processImage(file);
  }, [processImage]);

  // Handle drag and drop
  const handleDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      setError("Please drop a valid image file.");
      return;
    }
    
    await processImage(file);
  }, [processImage]);

  // Trigger file input dialog
  const triggerFileInput = (e: React.MouseEvent) => {
    e.stopPropagation();
    inputRef.current?.click();
  };

  // Handle crop button click
  const handleCrop = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCropper(true);
  };

  // Handle cropper cancellation
  const handleCancelCrop = () => {
    setShowCropper(false);
  };

  // Save cropped canvas to working state
  const handleSaveCroppedCanvas = (canvas: HTMLCanvasElement) => {
    setCroppedCanvas(canvas);
    setShowCropper(false);
    setPendingChanges(true);
  };

  // Update metadata in working state
  const handleMetadataChange = (newMetadata: Record<string, unknown>) => {
    setWorkingMetadata(newMetadata);
    setPendingChanges(true);
  };

  // Apply all pending changes
  const handleApplyChanges = () => {
    // Update the main metadata state with working metadata
    setMetadata(workingMetadata);
    setPendingChanges(false);
  };

  // Reset to original state
  const handleReset = () => {
    setCroppedCanvas(null);
    setWorkingMetadata(metadata);
    setPendingChanges(false);
  };

  // Download current image with metadata
  const handleDownload = async () => {
    if (!metadata) return;
    
    setProcessingDownload(true);
    try {
      // Use the cropped canvas if available, otherwise use the original image
      const format = originalFile?.type.includes('png') ? 'png' : 'jpeg';
      
      let blob;
      if (croppedCanvas) {
        blob = await saveImageWithMetadata(croppedCanvas, metadata, format as any);
      } else {
        // Create an image element from the original
        const img = new Image();
        img.src = image!;
        
        await new Promise((resolve) => {
          img.onload = resolve;
        });
        
        // Create a canvas to draw the original image
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        
        blob = await saveImageWithMetadata(canvas, metadata, format as any);
      }
      
      // Download the image
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const suffix = croppedCanvas ? '-edited' : '';
      link.download = originalFile?.name?.replace(/\.\w+$/, '') + suffix + '.' + format || `image${suffix}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error saving image:', error);
      setError('Failed to save image: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setProcessingDownload(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left side: Image viewer */}
        <div className="flex-1 min-w-0">
          {/* Image area */}
          <div className="mb-4 bg-background rounded-lg border overflow-hidden">
            {/* Header bar */}
            <div className="bg-muted/20 py-3 px-4 border-b flex justify-between items-center">
              <h2 className="text-md font-medium">Image</h2>
              {loading && <p className="text-xs text-muted-foreground">Processing...</p>}
              {pendingChanges && <Badge variant="outline" className="text-xs">Unsaved changes</Badge>}
            </div>
            
            {/* Main content area */}
            <div className="p-4">
              {/* Image display */}
              <div 
                className={`${!image ? 'border border-dashed rounded-lg p-6 cursor-pointer hover:bg-muted/5' : ''}`}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={image ? undefined : triggerFileInput}
              >
                <Input 
                  ref={inputRef}
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileSelect}
                />
                
                {image ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    {showCropper ? (
                      <ImageCropper 
                        imageUrl={image} 
                        metadata={metadata!}
                        onComplete={handleCancelCrop}
                        onSave={handleSaveCroppedCanvas}
                      />
                    ) : (
                      <>
                        <div className="flex justify-center bg-muted/5 p-2 rounded-md mb-4">
                          {croppedCanvas ? (
                            <img 
                              src={croppedCanvas.toDataURL()}
                              alt="Edited image" 
                              className="max-h-[450px] object-contain"
                            />
                          ) : (
                            <img 
                              src={image} 
                              alt="Uploaded image" 
                              className="max-h-[450px] object-contain"
                            />
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Upload className="w-10 h-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Drag and drop an image here, or click to select a file
                    </p>
                  </div>
                )}
              </div>
              
              {error && (
                <p className="text-destructive text-sm mt-2">{error}</p>
              )}
            </div>
            
            {/* Global action bar - only shows when an image is loaded and not cropping */}
            {image && !showCropper && (
              <div className="bg-muted/10 border-t py-3 px-4">
                <div className="flex flex-wrap gap-3 justify-between" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={triggerFileInput}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      New Image
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={handleCrop}
                    >
                      <Crop className="w-4 h-4 mr-2" />
                      Crop
                    </Button>
                    {pendingChanges && (
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Reset
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {pendingChanges && (
                      <Button 
                        variant="secondary"
                        size="sm"
                        onClick={handleApplyChanges}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Apply Changes
                      </Button>
                    )}
                    <Button 
                      variant="default"
                      size="sm"
                      onClick={handleDownload}
                      disabled={processingDownload || pendingChanges || !metadata}
                    >
                      {processingDownload ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      {processingDownload ? 'Processing...' : 'Download'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Info text */}
          <div className="text-xs text-muted-foreground px-2">
            Supported formats: PNG, JPEG, WebP
          </div>
        </div>

        {/* Right column: Metadata panel */}
        <div className="md:w-[450px] bg-background border rounded-lg">
          {metadata ? (
            <ImageMetadata 
              meta={metadata}
              workingMeta={workingMetadata || metadata}
              imageUrl={croppedCanvas ? croppedCanvas.toDataURL() : image || undefined}
              originalFile={originalFile || undefined}
              onMetadataChange={handleMetadataChange}
              hasPendingChanges={pendingChanges}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-10 h-[400px]">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground text-center">
                Nothing to see here yet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
"use client";

import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageMetadata } from "@/components/image-metadata";
import { ImageCropper } from "@/components/image-cropper";
import { preprocessImage } from "@/lib/metadata";
import { FileText, Upload, Crop, Download } from "lucide-react";
import { saveImageWithMetadata } from "@/lib/metadata/save-with-metadata";

export function ImageProcessor() {
  const [image, setImage] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [croppedCanvas, setCroppedCanvas] = useState<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setCroppedCanvas(null);
    
    try {
      const result = await preprocessImage(file);
      setImage(result.objectUrl);
      setMetadata(result.meta);
      setOriginalFile(file);
    } catch (err) {
      console.error("Error processing image:", err);
      setError("Failed to extract metadata from image.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }
    
    await processImage(file);
  }, [processImage]);

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

  const triggerFileInput = (e: React.MouseEvent) => {
    e.stopPropagation();
    inputRef.current?.click();
  };

  const handleSaveCroppedImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!croppedCanvas || !metadata) return;
    
    try {
      // Save image with metadata
      const format = originalFile?.type.includes('png') ? 'png' : 'jpeg';
      const blob = await saveImageWithMetadata(croppedCanvas, metadata, format as any);
      
      // Download the image
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = originalFile?.name?.replace(/\.\w+$/, '') + '-cropped.' + format || `cropped-image.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error saving image:', error);
      alert('Failed to save image: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleCrop = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCropper(true);
  };

  const handleSaveCroppedCanvas = (canvas: HTMLCanvasElement) => {
    setCroppedCanvas(canvas);
    setShowCropper(false);
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
                        onComplete={() => setShowCropper(false)}
                        onSave={handleSaveCroppedCanvas}
                      />
                    ) : (
                      <>
                        <div className="flex justify-center bg-muted/5 p-2 rounded-md mb-4">
                          {croppedCanvas ? (
                            <img 
                              src={croppedCanvas.toDataURL()}
                              alt="Cropped image" 
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
            
            {/* Action bar */}
            {image && !showCropper && (
              <div className="bg-muted/10 border-t py-3 px-4">
                <div className="flex flex-wrap gap-3" onClick={(e) => e.stopPropagation()}>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={triggerFileInput}
                  >
                    Upload Another
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={handleCrop}
                  >
                    <Crop className="w-4 h-4 mr-2" />
                    Crop
                  </Button>
                  {croppedCanvas && (
                    <Button 
                      variant="default"
                      size="sm"
                      onClick={handleSaveCroppedImage}
                      className="ml-auto"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  )}
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
        <div className="md:w-[450px] bg-background border rounded-lg overflow-hidden">
          {metadata ? (
            <ImageMetadata 
              meta={metadata}
              imageUrl={croppedCanvas ? croppedCanvas.toDataURL() : image || undefined}
              originalFile={originalFile || undefined}
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
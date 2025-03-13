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
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column: Image upload/display area */}
        <Card className="overflow-visible">
          <CardContent className="p-0 flex flex-col">
            <div 
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer relative" 
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
                <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                  {showCropper ? (
                    <ImageCropper 
                      imageUrl={image} 
                      metadata={metadata!}
                      onComplete={() => setShowCropper(false)}
                      onSave={handleSaveCroppedCanvas}
                    />
                  ) : (
                    <>
                      {croppedCanvas ? (
                        <img 
                          src={croppedCanvas.toDataURL()}
                          alt="Cropped image" 
                          className="max-h-[400px] object-contain"
                        />
                      ) : (
                        <img 
                          src={image} 
                          alt="Uploaded image" 
                          className="max-h-[400px] object-contain"
                        />
                      )}
                      <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                        <Button 
                          variant="outline" 
                          onClick={triggerFileInput}
                        >
                          Upload Another
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={handleCrop}
                        >
                          <Crop className="w-4 h-4 mr-2" />
                          Crop
                        </Button>
                        {croppedCanvas && (
                          <Button 
                            variant="default"
                            onClick={handleSaveCroppedImage}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10">
                  <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Drag and drop an image here, or click to select a file
                  </p>
                </div>
              )}
            </div>
            
            {error && (
              <p className="text-destructive text-sm mt-2 px-6">{error}</p>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <p className="text-sm text-muted-foreground">
              Supported formats: PNG, JPEG, WebP
            </p>
            {loading && <p className="text-sm">Processing...</p>}
          </CardFooter>
        </Card>

        {/* Right column: Metadata display */}
        {metadata ? (
          <ImageMetadata 
            meta={metadata} 
            className="h-full" 
            imageUrl={croppedCanvas ? croppedCanvas.toDataURL() : image || undefined}
            originalFile={originalFile || undefined}
          />
        ) : (
          <Card className="h-full flex flex-col justify-center items-center p-6">
            <FileText className="w-16 h-16 text-muted-foreground mb-4" />
            <CardDescription className="text-center">
              Upload an image to view its metadata
            </CardDescription>
          </Card>
        )}
      </div>
    </div>
  );
}
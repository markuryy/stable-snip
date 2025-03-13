"use client";

import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageMetadata } from "@/components/image-metadata";
import { preprocessImage } from "@/lib/metadata";
import { FileText, Upload } from "lucide-react";

export function ImageProcessor() {
  const [image, setImage] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await preprocessImage(file);
      setImage(result.objectUrl);
      setMetadata(result.meta);
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

  const triggerFileInput = () => {
    inputRef.current?.click();
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Image upload and preview section */}
        <Card>
          <CardHeader>
            <CardTitle>Image Processor</CardTitle>
            <CardDescription>
              Upload an image to extract and view its metadata
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer" 
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={triggerFileInput}
            >
              <Input 
                ref={inputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileSelect}
              />
              
              {image ? (
                <div className="flex flex-col items-center">
                  <img 
                    src={image} 
                    alt="Uploaded image" 
                    className="max-h-[300px] object-contain"
                  />
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerFileInput();
                    }}
                  >
                    Upload Another Image
                  </Button>
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
              <p className="text-destructive text-sm mt-2">{error}</p>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <p className="text-sm text-muted-foreground">
              Supported formats: PNG, JPEG, WebP
            </p>
            {loading && <p className="text-sm">Processing...</p>}
          </CardFooter>
        </Card>

        {/* Metadata display section */}
        {metadata ? (
          <ImageMetadata meta={metadata} className="h-full" />
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
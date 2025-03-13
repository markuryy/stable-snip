"use client";

import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Cropper, CropperRef } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css';
import 'react-advanced-cropper/dist/themes/corners.css';
import { 
  RotateCcw, 
  FlipHorizontal, 
  FlipVertical, 
  Check, 
  Lock, 
  Unlock, 
  RefreshCw,
  Download
} from 'lucide-react';
import { saveImageWithMetadata } from '@/lib/metadata/save-with-metadata';

interface ImageCropperProps {
  imageUrl: string;
  metadata: Record<string, any>;
  onComplete: () => void;
  onSave?: (canvas: HTMLCanvasElement) => void;
}

export function ImageCropper({ imageUrl, metadata, onComplete, onSave }: ImageCropperProps) {
  const cropperRef = useRef<CropperRef>(null);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [aspectLocked, setAspectLocked] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    if (cropperRef.current) {
      cropperRef.current.reset();
    }
  };

  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleFlipH = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFlipH((prev) => !prev);
  };

  const handleFlipV = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFlipV((prev) => !prev);
  };

  const toggleAspectLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAspectLocked(!aspectLocked);
  };

  const handleCommit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onComplete();
  };

  const handleSaveAndDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cropperRef.current) return;
    
    try {
      setIsProcessing(true);
      
      // Get crop coordinates
      const state = cropperRef.current.getState();
      if (!state || !state.coordinates) {
        alert('Invalid crop selection');
        return;
      }
      
      const coords = state.coordinates;
      
      // Generate the cropped image
      const canvas = cropperRef.current.getCanvas({
        width: coords.width,
        height: coords.height,
        minWidth: 100,
        minHeight: 100
      });
      
      if (!canvas) {
        alert('Failed to generate cropped image');
        return;
      }
      
      // If onSave callback is provided, use it
      if (onSave) {
        onSave(canvas);
      } else {
        // Otherwise save with metadata and download
        const blob = await saveImageWithMetadata(canvas, metadata, 'png');
        
        // Download the image
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'cropped-image.png';
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        URL.revokeObjectURL(url);
      }
      
      onComplete();
    } catch (error) {
      console.error('Error during crop operation:', error);
      alert('Failed to crop image: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-2 w-full" onClick={(e) => e.stopPropagation()}>
      <div className="relative w-full h-[400px] bg-neutral-800 rounded overflow-hidden">
        <Cropper
          ref={cropperRef}
          src={imageUrl}
          className="w-full h-full"
          stencilProps={{
            aspectRatio: aspectLocked ? 1 : undefined,
            theme: 'corners',
            movable: true,
            resizable: true,
          }}
          style={{
            transform: `
              rotate(${rotation}deg)
              scaleX(${flipH ? -1 : 1})
              scaleY(${flipV ? -1 : 1})
            `,
            transition: 'transform 0.2s ease',
          }}
        />
      </div>
      
      <div className="flex items-center flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleReset}
        >
          <RefreshCw size={14} className="mr-1" />
          Reset
        </Button>
        <Button variant="outline" size="sm" onClick={handleRotate}>
          <RotateCcw size={14} className="mr-1" />
          Rotate
        </Button>
        <Button variant="outline" size="sm" onClick={handleFlipH}>
          <FlipHorizontal size={14} className="mr-1" />
          Flip H
        </Button>
        <Button variant="outline" size="sm" onClick={handleFlipV}>
          <FlipVertical size={14} className="mr-1" />
          Flip V
        </Button>
        <Button 
          variant={aspectLocked ? "default" : "outline"} 
          size="sm" 
          onClick={toggleAspectLock}
        >
          {aspectLocked ? <Lock size={14} className="mr-1" /> : <Unlock size={14} className="mr-1" />}
          {aspectLocked ? "Unlock Ratio" : "Lock Ratio"}
        </Button>
        
        <div className="ml-auto">
          <Button 
            variant="default" 
            size="sm"
            onClick={handleSaveAndDownload}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <RefreshCw size={14} className="mr-1 animate-spin" />
            ) : (
              <Check size={14} className="mr-1" />
            )}
            {isProcessing ? 'Processing...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
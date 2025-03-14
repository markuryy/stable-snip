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
  X,
  RefreshCw,
  Proportions as AspectRatio,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

interface AspectRatioOption {
  label: string;
  value: number | undefined;
  description?: string;
}

interface ImageCropperProps {
  imageUrl: string;
  metadata: Record<string, unknown>;
  onComplete: () => void;
  onSave?: (canvas: HTMLCanvasElement) => void;
}

export function ImageCropper({ imageUrl, metadata, onComplete, onSave }: ImageCropperProps) {
  const cropperRef = useRef<CropperRef>(null);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState(false);

  // Common aspect ratios
  const aspectRatios: AspectRatioOption[] = [
    { label: "Free", value: undefined, description: "No constraints" },
    { label: "Square", value: 1, description: "1:1" },
    { label: "Portrait", value: 3/4, description: "3:4" },
    { label: "Landscape", value: 4/3, description: "4:3" },
    { label: "Cinema", value: 16/9, description: "16:9" },
    { label: "Widescreen", value: 21/9, description: "21:9" },
  ];
  
  const getCurrentAspectRatioLabel = () => {
    const current = aspectRatios.find(ratio => ratio.value === aspectRatio);
    return current ? current.label : "Free";
  };

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

  const handleSetAspectRatio = (ratio: string) => {
    const numRatio = ratio === "undefined" ? undefined : Number(ratio);
    setAspectRatio(numRatio);
  };

  const handleApplyCrop = async (e: React.MouseEvent) => {
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
      
      // Use onSave callback to pass canvas back to parent
      if (onSave) {
        onSave(canvas);
      }
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
            aspectRatio: aspectRatio,
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
      
      {/* Editing tools */}
      <div className="flex flex-col gap-3 py-1" onClick={(e) => e.stopPropagation()}>
        {/* Transform tools */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <AspectRatio size={14} className="mr-1" />
                  {getCurrentAspectRatioLabel()}
                  <ChevronDown size={14} className="ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-44">
                <DropdownMenuLabel>Aspect Ratio</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup 
                  value={aspectRatio?.toString() || "undefined"}
                  onValueChange={handleSetAspectRatio}
                >
                  {aspectRatios.map((ratio) => (
                    <DropdownMenuRadioItem 
                      key={ratio.label} 
                      value={ratio.value?.toString() || "undefined"}
                    >
                      {ratio.label}
                      {ratio.description && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          {ratio.description}
                        </span>
                      )}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button variant="outline" size="sm" onClick={handleReset}>
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
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onComplete}
            >
              <X size={14} className="mr-1" />
              Cancel
            </Button>
            <Button 
              variant="default" 
              size="sm"
              onClick={handleApplyCrop}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <RefreshCw size={14} className="mr-1 animate-spin" />
              ) : (
                <Check size={14} className="mr-1" />
              )}
              {isProcessing ? 'Processing...' : 'Apply Crop'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
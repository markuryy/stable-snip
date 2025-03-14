"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ChevronDown, ChevronUp, FileJson, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { encodeMetadata } from "@/lib/metadata";
import { saveImageWithMetadata } from "@/lib/metadata/save-with-metadata";

type MetaDisplayItem = {
  label: string;
  value: string | number | React.ReactNode;
};

type ImageMetaProps = {
  meta: Record<string, unknown>;
  className?: string;
  imageUrl?: string;
  originalFile?: File;
  onMetadataChange?: (metadata: Record<string, unknown>) => void;
  hasChanges?: boolean;
};

// Dictionary mapping metadata keys to display labels
const labelDictionary: Record<string, string> = {
  prompt: 'Prompt',
  negativePrompt: 'Negative prompt',
  cfgScale: 'CFG scale',
  steps: 'Steps',
  sampler: 'Sampler',
  seed: 'Seed',
  Model: 'Model',
  'Clip skip': 'Clip skip',
  clipSkip: 'Clip skip',
  scheduler: 'Scheduler',
  width: 'Width',
  height: 'Height',
  denoise: 'Denoise',
};

export function ImageMetadata({ 
  meta, 
  className, 
  imageUrl, 
  originalFile,
  onMetadataChange,
  hasChanges
}: ImageMetaProps) {
  const [rawExpanded, setRawExpanded] = useState(false);
  const [editedMetadata, setEditedMetadata] = useState<string>(
    meta.prompt ? encodeMetadata(meta) : JSON.stringify(meta, null, 2)
  );
  
  // Organize metadata into categories by length
  const { long, medium, short, hasComfy, resources } = organizeMeta(meta);
  
  // Whether there's any metadata to display
  const hasRegularMeta = long.length > 0 || medium.length > 0 || short.length > 0;
  
  // Generation process
  const generationProcess = meta.comfy ? 'ComfyUI' : 'txt2img';
  
  // Update edited metadata when metadata changes
  useEffect(() => {
    setEditedMetadata(
      meta.prompt ? encodeMetadata(meta) : JSON.stringify(meta, null, 2)
    );
  }, [meta]);
  
  // Apply metadata changes
  const handleApplyMetadataChanges = () => {
    if (!onMetadataChange) return;
    
    try {
      let parsedMetadata;
      if (meta.prompt) {
        // For A1111/SD WebUI format - keep the format but update content
        parsedMetadata = {...meta, prompt: editedMetadata};
      } else {
        // For JSON/ComfyUI format
        parsedMetadata = JSON.parse(editedMetadata);
      }
      
      onMetadataChange(parsedMetadata);
    } catch (error) {
      console.error('Error parsing metadata:', error);
      alert('Failed to parse metadata: ' + (error instanceof Error ? error.message : String(error)));
    }
  };
  
  if (!hasRegularMeta && !hasComfy) {
    return (
      <div className={className}>
        <div className="border-b py-3 px-4">
          <h2 className="text-md font-medium">Generation Parameters</h2>
          <p className="text-sm text-muted-foreground">No supported metadata found in this image</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={className}>
      <div className="border-b py-3 px-4 flex items-center justify-between">
        <h2 className="text-md font-medium">Generation Parameters</h2>
        <Badge variant="outline" className="rounded-sm">
          {generationProcess}
        </Badge>
      </div>
      <div className="p-4 px-6">
        <Tabs defaultValue="formatted">
        <TabsList>
          <TabsTrigger value="formatted">Formatted</TabsTrigger>
          <TabsTrigger value="raw">Raw</TabsTrigger>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          </TabsList>
          
          <TabsContent value="formatted">
            <div className="py-2">
              {/* Long format metadata (prompt, etc.) */}
              {long.map(({ label, value }) => (
                <div key={label} className="mb-4">
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-sm">{label}</div>
                    <CopyButton text={value?.toString() || ''} />
                  </div>
                  <pre className="text-xs bg-muted mt-1 p-2 px-3 rounded-md whitespace-pre-wrap break-words w-full min-h-[1.8rem]">
                    {value}
                  </pre>
                </div>
              ))}
              
              {/* Medium length metadata items */}
              {medium.map(({ label, value }) => (
                <div key={label} className="mb-2 flex justify-between items-center">
                  <div className="font-medium text-sm">{label}</div>
                  <pre className="text-xs bg-muted p-1 py-1.5 px-3 rounded-md flex-1 text-right ml-2 whitespace-pre-wrap break-words min-h-[1.8rem] leading-normal">
                    {value}
                  </pre>
                </div>
              ))}
              
              {/* Short metadata items in single column */}
              {short.length > 0 && (
                <div className="flex flex-col gap-y-2 mt-3">
                  {short.map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center">
                      <div className="font-medium text-sm">{label}</div>
                      <pre className="text-xs bg-muted p-1 py-1.5 px-3 rounded-md whitespace-pre-wrap ml-2 leading-normal">{value}</pre>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Resources */}
              {resources.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="mb-2">
                    <div className="font-medium text-sm mb-2">Resources</div>
                    <div className="flex flex-col gap-2">
                      {resources.map(({ label, value }, index) => (
                        <div key={index} className="flex justify-between items-start">
                          <div className="font-medium text-sm pt-1.5">{label}</div>
                          <pre className="text-xs bg-muted p-1 py-1.5 px-3 rounded-md flex-1 text-right ml-2 whitespace-pre-wrap break-words min-h-[1.8rem] leading-normal max-w-[70%] font-mono">
                            {value}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              
              {/* ComfyUI workflow */}
              {hasComfy && (
                <>
                  <Separator className="my-4" />
                  <div className="mb-2">
                    <div className="font-medium text-sm">ComfyUI Workflow</div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-1"
                      onClick={() => setRawExpanded(!rawExpanded)}
                    >
                      {rawExpanded ? 'Hide' : 'Show'} Workflow Data
                      {rawExpanded ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
                    </Button>
                    
                    {rawExpanded && (
                      <pre className="text-xs bg-muted mt-2 p-2 px-3 rounded-md whitespace-pre-wrap break-words w-full">
                        {JSON.stringify(meta.comfy, null, 2)}
                      </pre>
                    )}
                  </div>
                </>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="raw">
            <div className="py-2">
              <div className="relative">
                <CopyButton text={JSON.stringify(meta, null, 2)} className="absolute top-2 right-2" />
                <pre className="text-xs bg-muted p-3 px-4 rounded-md whitespace-pre-wrap break-words w-full">
                  {JSON.stringify(meta, null, 2)}
                </pre>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="edit">
            <div className="space-y-4">
              <Textarea 
                value={editedMetadata}
                onChange={(e) => setEditedMetadata(e.target.value)}
                className="font-mono text-xs h-[300px]"
              />
              <Button
                variant="secondary"
                onClick={handleApplyMetadataChanges}
                disabled={!onMetadataChange}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                Apply Changes
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Helper component for copy button
function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className={cn("h-7 w-7 min-w-[4rem]", className)} 
      onClick={handleCopy}
    >
      {copied ? <Badge className="text-xs">Copied!</Badge> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

// Helper function to organize metadata into categories
function organizeMeta(meta: Record<string, unknown>) {
  const long: MetaDisplayItem[] = [];
  const medium: MetaDisplayItem[] = [];
  const short: MetaDisplayItem[] = [];
  const resources: MetaDisplayItem[] = [];
  
  // Parse the comfy data if it's a string
  let comfyData;
  if (typeof meta.comfy === 'string') {
    try {
      comfyData = JSON.parse(meta.comfy);
    } catch (_) {
      comfyData = { error: 'Invalid JSON' };
    }
  } else {
    comfyData = meta.comfy;
  }
  
  // Check if we have ComfyUI metadata
  const hasComfy = !!comfyData;
  
  // Extract resources if available
  let modelAdded = false;
  
  if (meta.resources && Array.isArray(meta.resources)) {
    for (const resource of meta.resources) {
      if (resource.type && resource.name) {
        // Handle model specially to avoid duplication
        if (resource.type === 'model') {
          modelAdded = true;
        }
        
        const label = `${resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}`;
        const detail = resource.weight ? ` (weight: ${resource.weight})` : '';
        const value = `${resource.name}${detail}`;
        resources.push({ label, value });
      }
    }
  }
  
  // Only add Model if not already added through resources
  if (meta.Model && !modelAdded && !resources.some(r => r.label === 'Model')) {
    resources.push({ label: 'Model', value: String(meta.Model) });
  }
  
  // Categorize other metadata by length
  for (const key of Object.keys(meta)) {
    // Skip the comfy data and resources as we handle them separately
    if (key === 'comfy' || key === 'resources' || key === 'Model') continue;
    // Skip complex objects unless we want to display them
    if (typeof meta[key] === 'object' && !Array.isArray(meta[key])) continue;
    
    const value = meta[key]?.toString();
    if (value === undefined || value === null) continue;
    
    const label = labelDictionary[key] || key;
    
    if (value.length > 50 || key === 'prompt' || key === 'negativePrompt') {
      // Put negative prompt directly after prompt
      if (key === 'prompt') {
        long.unshift({ label, value });
      } else if (key === 'negativePrompt') {
        // Try to find prompt position to insert after it
        const promptIndex = long.findIndex(item => item.label === 'Prompt');
        if (promptIndex >= 0) {
          long.splice(promptIndex + 1, 0, { label, value });
        } else {
          // If no prompt found yet, just add it (will be reordered when prompt comes)
          long.push({ label, value });
        }
      } else {
        long.push({ label, value });
      }
    } else if (value.length > 15) {
      medium.push({ label, value });
    } else {
      short.push({ label, value });
    }
  }
  
  return { long, medium, short, hasComfy, resources };
}
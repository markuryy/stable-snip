"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ChevronDown, ChevronUp, FileJson } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type MetaDisplayItem = {
  label: string;
  value: string | number | React.ReactNode;
};

type ImageMetaProps = {
  meta: Record<string, any>;
  className?: string;
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

export function ImageMetadata({ meta, className }: ImageMetaProps) {
  const [rawExpanded, setRawExpanded] = useState(false);
  
  // Organize metadata into categories by length
  const { long, medium, short, hasComfy } = organizeMeta(meta);
  
  // Whether there's any metadata to display
  const hasRegularMeta = long.length > 0 || medium.length > 0 || short.length > 0;
  
  // Software/generation process
  const software = meta.software?.toString() || 'External Generator';
  const generationProcess = meta.comfy ? 'ComfyUI' : 'txt2img';
  
  if (!hasRegularMeta && !hasComfy) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Image Metadata</CardTitle>
          <CardDescription>No metadata found in this image</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Image Metadata
          <Badge variant="outline" className="rounded-sm">
            {software}
          </Badge>
          <Badge variant="outline" className="rounded-sm">
            {generationProcess}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="formatted">
          <TabsList>
            <TabsTrigger value="formatted">Formatted</TabsTrigger>
            <TabsTrigger value="raw">Raw</TabsTrigger>
          </TabsList>
          
          <TabsContent value="formatted">
            <ScrollArea className="max-h-[500px] pr-3">
              {/* Long format metadata (prompt, etc.) */}
              {long.map(({ label, value }) => (
                <div key={label} className="mb-4">
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-sm">{label}</div>
                    <CopyButton text={value.toString()} />
                  </div>
                  <pre className="text-xs bg-muted mt-1 p-2 rounded-md whitespace-pre-wrap break-words overflow-auto max-h-[150px]">
                    {value}
                  </pre>
                </div>
              ))}
              
              {/* Medium length metadata items */}
              {medium.map(({ label, value }) => (
                <div key={label} className="mb-2 flex justify-between items-start">
                  <div className="font-medium text-sm">{label}</div>
                  <pre className="text-xs bg-muted p-1 rounded-md flex-1 text-right ml-2 max-w-[70%] overflow-hidden">
                    {value}
                  </pre>
                </div>
              ))}
              
              {/* Short metadata items in grid */}
              {short.length > 0 && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3">
                  {short.map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center">
                      <div className="font-medium text-sm">{label}</div>
                      <pre className="text-xs bg-muted p-1 rounded-md">{value}</pre>
                    </div>
                  ))}
                </div>
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
                      <pre className="text-xs bg-muted mt-2 p-2 rounded-md whitespace-pre-wrap break-words overflow-auto max-h-[300px]">
                        {JSON.stringify(meta.comfy, null, 2)}
                      </pre>
                    )}
                  </div>
                </>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="raw">
            <ScrollArea className="max-h-[500px]">
              <div className="relative">
                <CopyButton text={JSON.stringify(meta, null, 2)} className="absolute top-2 right-2" />
                <pre className="text-xs bg-muted p-3 rounded-md whitespace-pre-wrap break-words overflow-auto">
                  {JSON.stringify(meta, null, 2)}
                </pre>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
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
      className={cn("h-7 w-7", className)}
      onClick={handleCopy}
    >
      {copied ? <Badge className="text-xs">Copied!</Badge> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

// Helper function to organize metadata into categories
function organizeMeta(meta: Record<string, any>) {
  const long: MetaDisplayItem[] = [];
  const medium: MetaDisplayItem[] = [];
  const short: MetaDisplayItem[] = [];
  
  // Parse the comfy data if it's a string
  let comfyData;
  if (typeof meta.comfy === 'string') {
    try {
      comfyData = JSON.parse(meta.comfy);
    } catch (e) {
      comfyData = { error: 'Invalid JSON' };
    }
  } else {
    comfyData = meta.comfy;
  }
  
  // Check if we have ComfyUI metadata
  const hasComfy = !!comfyData;
  
  // Categorize other metadata by length
  for (const key of Object.keys(meta)) {
    // Skip the comfy data as we handle it separately
    if (key === 'comfy') continue;
    // Skip complex objects unless we want to display them
    if (typeof meta[key] === 'object' && !Array.isArray(meta[key])) continue;
    
    const value = meta[key]?.toString();
    if (value === undefined || value === null) continue;
    
    const label = labelDictionary[key] || key;
    
    if (value.length > 50 || key === 'prompt') {
      long.push({ label, value });
    } else if (value.length > 15 || key === 'Model' || key === 'negativePrompt') {
      medium.push({ label, value });
    } else {
      short.push({ label, value });
    }
  }
  
  return { long, medium, short, hasComfy };
}
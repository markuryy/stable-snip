# Civitai Image Metadata Extraction Documentation

This document outlines how Civitai extracts and parses metadata from images, including metadata from Stable Diffusion (A1111), ComfyUI, and other AI image generation tools.

## Overview

Civitai's metadata extraction system consists of multiple components:

1. **Main Entry Point**: `getMetadata` function in `src/utils/metadata/index.ts`
2. **Format-Specific Parsers**:
   - `automaticMetadataProcessor` for Automatic1111/SD WebUI
   - `comfyMetadataProcessor` for ComfyUI
   - `rfooocusMetadataProcessor` for Rfooocus
   - `swarmUIMetadataProcessor` for SwarmUI

3. **Helper Utilities**:
   - EXIF reader for extracting raw metadata
   - Encoding helpers for handling UTF-16 encoding
   - Schema validation with Zod

## Extraction Process

### 1. Entry Point

The entry point for metadata extraction is the `getMetadata` function that:

```typescript
export async function getMetadata(file: File | string) {
  try {
    // Load EXIF data from the image file
    const tags = await ExifReader.load(file, { includeUnknown: true });
    delete tags['MakerNote'];
    
    // Convert EXIF data to a simple key-value object
    const exif = Object.entries(tags).reduce((acc, [key, value]) => {
      acc[key] = value.value;
      return acc;
    }, {} as Record<string, any>); 

    // Handle special UserComment field (often contains generation data in SD images)
    if (exif.UserComment) {
      exif.userComment = Int32Array.from(exif.UserComment);
    }
    
    // Store EXIF data in global context (for debugging)
    setGlobalValue('exif', exif);

    // Determine which parser to use based on the metadata format
    let metadata = {};
    try {
      const { parse } = Object.values(parsers).find((x) => x.canParse(exif)) ?? {};
      if (parse) metadata = parse(exif);
    } catch (e) {
      console.error('Error parsing metadata', e);
    }
    
    // Validate the extracted metadata against the schema
    const result = imageMetaSchema.safeParse(metadata);
    return result.success ? result.data : {};
  } catch (e) {
    console.log(e);
    return {};
  }
}
```

### 2. Parser Selection

The system automatically detects which parser to use by checking the EXIF data format:

```typescript
const parsers = {
  automatic: automaticMetadataProcessor,
  swarmui: swarmUIMetadataProcessor,
  comfy: comfyMetadataProcessor,
  rfooocus: rfooocusMetadataProcessor,
};
```

Each parser implements a `canParse` function that determines if it can handle the given EXIF data.

### 3. Format-Specific Parsing

#### Automatic1111/SD WebUI Format

The `automaticMetadataProcessor` handles traditional Stable Diffusion WebUI/Automatic1111 format which stores data in a specific structure:

```
Prompt text here...
Negative prompt: Negative prompt text here...
Steps: 20, Sampler: Euler a, CFG scale: 7, Seed: 12345, Size: 512x512, Model hash: 1234abcd, Model: modelName
```

Key components:
- `canParse`: Checks for "Steps: " in the generation details
- `parse`: Extracts:
  - Prompt and negative prompt
  - Generation parameters (steps, sampler, CFG scale, seed, etc.)
  - Model information 
  - Lora/hypernet details
  - Hashes for various components

The extraction uses regex patterns and string manipulation to parse the structured text.

#### ComfyUI Format

The `comfyMetadataProcessor` handles ComfyUI's JSON-based metadata:

```typescript
export const comfyMetadataProcessor = createMetadataProcessor({
  canParse: (exif) => {
    // Check for standard ComfyUI format
    const isStandardComfy = exif.prompt || exif.workflow;
    if (isStandardComfy) return true;

    // Check for WebP format
    const isWebpComfy = exif?.Model?.[0]?.startsWith('prompt:');
    if (isWebpComfy) {
      const comfyJson = exif.Model[0].replace(/^prompt:/, '');
      exif.prompt = comfyJson;
      exif.workflow = comfyJson;
      // Process additional metadata
      // ...
      return true;
    }

    // Other format detection logic
    // ...
  },
  parse: (exif) => {
    // Parse ComfyUI workflow JSON
    const prompt = JSON.parse(cleanBadJson(exif.prompt as string));
    
    // Process nodes to extract information about:
    // - Samplers (KSamplerAdvanced, KSampler, etc.)
    // - LoRA nodes
    // - Checkpoint models
    // - Upscalers
    // - VAEs
    // - ControlNet models
    
    // Build metadata from extracted information
    const metadata = {
      models,
      upscalers,
      vaes,
      additionalResources,
      controlNets,
      // ...
      comfy: isCivitComfy ? undefined : `{"prompt": ${exif.prompt}, "workflow": ${exif.workflow}}`
    };
    
    // Extract additional information from workflow
    // ...
    
    return metadata;
  },
  encode: (meta) => {
    // Convert metadata back to ComfyUI format
    const comfy = typeof meta.comfy === 'string' ? fromJson<ComfyMetaSchema>(meta.comfy) : meta.comfy;
    return comfy && comfy.workflow ? JSON.stringify(comfy.workflow) : '';
  }
});
```

ComfyUI parsing is more complex as it needs to:
1. Handle different JSON structures
2. Extract data from various node types
3. Navigate the workflow graph to find relevant parameters
4. Map node-specific values to standard metadata fields

### 4. Decoding UTF-16 Data

Many image formats encode metadata in big-endian UTF-16, which requires special handling:

```typescript
export function decodeBigEndianUTF16(buffer: Uint8Array): string {
  // Remove Unicode header bytes if present
  const bufferWithoutBOM = removeUnicodeHeader(buffer);
  // Swap the byte order from big-endian to little-endian
  const littleEndianBuffer = swapByteOrder(bufferWithoutBOM);
  // Use TextDecoder to decode the little-endian buffer
  return decoder.decode(littleEndianBuffer);
}
```

This function properly decodes UTF-16 encoded metadata found in image EXIF data.

## Metadata Schema

The metadata is validated against a defined schema using Zod:

```typescript
export const imageMetaSchema = imageGenerationSchema.partial().passthrough();

export const imageGenerationSchema = z.object({
  prompt: undefinedString,
  negativePrompt: undefinedString,
  cfgScale: stringToNumber,
  steps: stringToNumber,
  sampler: undefinedString,
  seed: stringToNumber,
  hashes: z.record(z.string()).optional(),
  clipSkip: z.coerce.number().optional(),
  'Clip skip': z.coerce.number().optional(),
  comfy: z.union([z.string().optional(), comfyMetaSchema.optional()]).optional(),
  external: externalMetaSchema.optional(),
  extra: z.object({ remixOfId: z.number().optional() }).optional(),
});
```

## Integration Points

The metadata extraction is integrated with the application through:

1. **Image preprocessing**: The `preprocessImage` function in `src/utils/media-preprocessors/image.preprocessor.ts`
2. **UI components**: Displaying metadata in `src/components/ImageMeta/ImageMeta.tsx`
3. **Content auditing**: Scanning for problematic content via `auditImageMeta`

## Content Moderation

Civitai includes content moderation that scans extracted metadata:

```typescript
export const auditImageMeta = async (meta: ImageMetaProps | undefined, nsfw: boolean) => {
  const auditResult = await auditMetaData(meta, nsfw);
  return { blockedFor: !auditResult?.success ? auditResult?.blockedFor : undefined };
};
```

This checks for:
- NSFW content
- Age-related references
- Blocked terms and phrases

## Implementing a Similar System

To implement a similar system:

1. **Use ExifReader**: For extracting raw metadata from images
2. **Create Format Detectors**: Functions that can identify different metadata formats
3. **Implement Format-Specific Parsers**: For each supported format (A1111, ComfyUI, etc.)
4. **Define a Common Schema**: To normalize metadata across formats
5. **Handle Encoding Issues**: Particularly for UTF-16 encoded metadata

## Key Challenges

1. **Format Diversity**: Different tools encode metadata in very different ways
2. **Encoding Issues**: Dealing with UTF-16 and other encodings
3. **Schema Normalization**: Converting varied formats to a consistent structure
4. **Workflow Parsing**: For ComfyUI, understanding the node graph structure
5. **Backward Compatibility**: Supporting both old and new metadata formats
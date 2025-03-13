import { automaticMetadataProcessor } from "./automatic.metadata";
import { comfyMetadataProcessor } from "./comfy.metadata";

type MetadataProcessor = {
  canParse: (exif: Record<string, any>) => boolean;
  parse: (exif: Record<string, any>) => Record<string, any>;
  encode: (meta: Record<string, any>) => string;
};

const parsers: Record<string, MetadataProcessor> = {
  automatic: automaticMetadataProcessor,
  comfy: comfyMetadataProcessor,
};

/**
 * Extract metadata from an image file
 */
export async function getMetadata(file: File | string) {
  try {
    // Import ExifReader dynamically to avoid SSR issues
    const ExifReader = (await import('exifreader')).default;
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

    let metadata = {};
    try {
      const { parse } = Object.values(parsers).find((x) => x.canParse(exif)) ?? {};
      if (parse) metadata = parse(exif);
    } catch (e: any) {
      console.error('Error parsing metadata', e);
    }
    
    return metadata;
  } catch (e) {
    console.error(e);
    return {};
  }
}

/**
 * Re-encode metadata in the specified format
 */
export function encodeMetadata(meta: Record<string, any>, type: keyof typeof parsers = 'automatic') {
  return parsers[type]?.encode(meta);
}

/**
 * Parse a prompt string into metadata
 */
export const parsePromptMetadata = (generationDetails: string) => {
  return automaticMetadataProcessor.parse({ generationDetails });
};

/**
 * Process a file to extract its metadata and dimensions
 */
export const preprocessImage = async (file: File) => {
  const objectUrl = URL.createObjectURL(file);
  const meta = await getMetadata(file);
  const dimensions = await getImageDimensions(objectUrl);

  return {
    objectUrl,
    metadata: {
      size: file.size,
      ...dimensions,
    },
    meta,
  };
};

/**
 * Get image dimensions from a URL
 */
const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
      });
    };
    img.onerror = reject;
    img.src = url;
  });
};
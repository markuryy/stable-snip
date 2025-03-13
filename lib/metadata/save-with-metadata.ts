import { encodeMetadata } from './index';
// Import the PNG chunks libraries directly
import pngChunkText from 'png-chunk-text';
// Use dynamic imports for the problematic libraries
import dynamic from 'next/dynamic';

/**
 * Takes a canvas containing the cropped image and embeds metadata into it
 * @param canvas - HTML Canvas element with the cropped image
 * @param metadata - Object containing the metadata to embed
 * @param format - Output format (default 'png')
 * @returns Blob of the image with embedded metadata
 */
export async function saveImageWithMetadata(
  canvas: HTMLCanvasElement, 
  metadata: Record<string, any>,
  format: 'png' | 'jpeg' = 'png'
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const quality = format === 'png' ? undefined : 0.95;
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error('Failed to create image blob'));
          return;
        }
        
        try {
          if (format === 'png') {
            // Get metadata as a string
            let metadataString = '';
            if (metadata.prompt) {
              metadataString = encodeMetadata(metadata);
            } else {
              metadataString = JSON.stringify(metadata);
            }
            
            // Convert blob to array buffer
            const arrayBuffer = await blob.arrayBuffer();
            
            try {
              // Dynamically import the PNG chunks libraries
              const pngChunksExtractModule = await import('png-chunks-extract');
              const pngChunksEncodeModule = await import('png-chunks-encode');
              
              const extractChunks = pngChunksExtractModule.default || pngChunksExtractModule;
              const encodeChunks = pngChunksEncodeModule.default || pngChunksEncodeModule;
              
              // Extract chunks from PNG
              const chunks = extractChunks(new Uint8Array(arrayBuffer));
              
              // Create a text chunk with the metadata
              const textChunk = pngChunkText.encode('parameters', metadataString);
              
              // Add the text chunk before the IEND chunk (which should be last)
              chunks.splice(chunks.length - 1, 0, textChunk);
              
              // Encode the chunks back to PNG
              const newBuffer = encodeChunks(chunks);
              
              // Create a new blob with the PNG data
              const newBlob = new Blob([newBuffer], { type: mimeType });
              resolve(newBlob);
            } catch (error) {
              console.error('Error processing PNG chunks:', error);
              console.warn('Falling back to saving without metadata');
              resolve(blob);
            }
          } else if (format === 'jpeg') {
            // For JPEG, we need to embed EXIF data
            // This is a bit more complex and requires a library like piexifjs
            // For now, we're just focusing on PNG
            console.warn('JPEG metadata embedding not fully implemented yet');
            resolve(blob);
          } else {
            resolve(blob);
          }
        } catch (error) {
          console.error('Error embedding metadata:', error);
          resolve(blob); // Fallback to original blob
        }
      }, mimeType, quality);
    } catch (error) {
      reject(error);
    }
  });
}
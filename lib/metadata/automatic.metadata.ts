import { decodeBigEndianUTF16 } from "../encoding-helpers";

// #region [helpers]
const hashesRegex = /, Hashes:\s*({[^}]+})/;
const civitaiResources = /, Civitai resources:\s*(\[\{.*?\}\])/;
const civitaiMetadata = /, Civitai metadata:\s*(\{.*?\})/;
const badExtensionKeys = ['Resources: ', 'Hashed prompt: ', 'Hashed Negative prompt: '];
const templateKeys = ['Template: ', 'Negative Template: '] as const;
const automaticExtraNetsRegex = /<(lora|hypernet):([a-zA-Z0-9_\.\-]+):([0-9.]+)>/g;
const automaticNameHash = /([a-zA-Z0-9_\.]+)\(([a-zA-Z0-9]+)\)/;

// Mapping from SD parameters to our internal keys
const automaticSDKeyMap = new Map<string, string>([
  ['Seed', 'seed'],
  ['CFG scale', 'cfgScale'],
  ['Sampler', 'sampler'],
  ['Steps', 'steps'],
  ['Clip skip', 'clipSkip'],
]);
const getSDKey = (key: string) => automaticSDKeyMap.get(key.trim()) ?? key.trim();

// For encoding back to SD format
const automaticSDEncodeMap = new Map<string, string>(
  Array.from(automaticSDKeyMap, (a) => a.reverse()) as Iterable<readonly [string, string]>
);

// Keys to exclude from generic parameters
const excludedKeys = [
  'hashes',
  'civitaiResources',
  'scheduler',
  'vaes',
  'additionalResources',
  'comfy',
  'upscalers',
  'models',
  'controlNets',
  'denoise',
  'other',
  'external',
];

// Parse a line of generation parameters
function parseDetailsLine(line: string | undefined): Record<string, any> {
  const result: Record<string, any> = {};
  if (!line) return result;
  let currentKey = '';
  let currentValue = '';
  let insideQuotes = false;
  let insideDate = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes) {
        result[currentKey] = parseDetailsLine(currentValue.trim());
        currentKey = '';
      }
      insideQuotes = !insideQuotes;
    } else if (char === ':' && !insideQuotes && !insideDate) {
      if (isPartialDate(currentValue)) insideDate = true;
      else {
        currentKey = getSDKey(currentValue.trim());
        currentValue = '';
      }
    } else if (char === ',' && !insideQuotes) {
      if (insideDate) insideDate = false;
      if (currentKey) result[currentKey] = currentValue.trim();
      currentKey = '';
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  if (currentKey) result[currentKey] = currentValue.trim();

  return result;
}

function isPartialDate(date: string) {
  return date.length === 14 && date[11] === 'T';
}
// #endregion

// Type for resources extracted from prompts
type SDResource = {
  type: string;
  name: string;
  weight?: number;
  hash?: string;
};

export const automaticMetadataProcessor = {
  canParse(exif: Record<string, any>) {
    let generationDetails = null;
    if (exif?.parameters) {
      generationDetails = exif.parameters;
    } else if (exif?.userComment) {
      generationDetails = decodeBigEndianUTF16(exif.userComment);
    }

    if (generationDetails) {
      exif.generationDetails = generationDetails;
      return generationDetails.includes('Steps: ');
    }
    return false;
  },
  
  parse(exif: Record<string, any>) {
    const metadata: Record<string, any> = {};
    const generationDetails = exif.generationDetails as string;

    if (!generationDetails) return metadata;
    const metaLines = generationDetails.split('\n').filter((line) => line.trim() !== '');

    // Remove templates
    for (const key of templateKeys) {
      const templateLineIndex = metaLines.findIndex((line) => line.startsWith(key));
      if (templateLineIndex === -1) continue;
      metaLines.splice(templateLineIndex, 1);

      // Remove all lines until we hit a new key `[\w\s]+: `
      while (
        templateLineIndex < metaLines.length &&
        !/[\w\s]+: /.test(metaLines[templateLineIndex])
      ) {
        metaLines.splice(templateLineIndex, 1);
      }
    }

    let detailsLine = metaLines.find((line) => line.startsWith('Steps: '))?.replace(/\,\s*$/, '');
    // Strip it from the meta lines
    if (detailsLine) metaLines.splice(metaLines.indexOf(detailsLine), 1);
    // Remove meta keys I wish I hadn't made... :(
    for (const key of badExtensionKeys) {
      if (!detailsLine?.includes(key)) continue;
      detailsLine = detailsLine.split(key)[0];
    }

    // Extract Hashes
    const hashes = detailsLine?.match(hashesRegex)?.[1];
    if (hashes && detailsLine) {
      metadata.hashes = JSON.parse(hashes);
      detailsLine = detailsLine.replace(hashesRegex, '');
    }

    // Extract Civitai Resources
    const civitaiResourcesMatch = detailsLine?.match(civitaiResources)?.[1];
    if (civitaiResourcesMatch && detailsLine) {
      metadata.civitaiResources = JSON.parse(civitaiResourcesMatch);
      detailsLine = detailsLine.replace(civitaiResources, '');
    }

    // Extract Civitai Metadata
    const civitaiMetadataMatch = detailsLine?.match(civitaiMetadata)?.[1];
    if (civitaiMetadataMatch && detailsLine) {
      const data = JSON.parse(civitaiMetadataMatch) as Record<string, any>;
      if (Object.keys(data).length !== 0) metadata.extra = data;
      detailsLine = detailsLine.replace(civitaiMetadata, '');
    }

    // Extract fine details
    const details = parseDetailsLine(detailsLine);
    for (const [k, v] of Object.entries(details)) {
      const key = automaticSDKeyMap.get(k) ?? k;
      if (excludedKeys.includes(key)) continue;
      metadata[key] = v;
    }

    // Extract prompts
    const [prompt, ...negativePrompt] = metaLines
      .join('\n')
      .split('Negative prompt:')
      .map((x) => x.trim());
    metadata.prompt = prompt;
    metadata.negativePrompt = negativePrompt.join(' ').trim();

    // Extract resources
    const extranets = [...prompt.matchAll(automaticExtraNetsRegex)];
    const resources: SDResource[] = extranets.map(([, type, name, weight]) => ({
      type,
      name,
      weight: parseFloat(weight),
    }));

    // Extract Lora hashes
    if (metadata['Lora hashes']) {
      if (!metadata.hashes) metadata.hashes = {};
      for (const [name, hash] of Object.entries(metadata['Lora hashes'])) {
        metadata.hashes[`lora:${name}`] = hash;
        const resource = resources.find((r) => r.name === name);
        if (resource) resource.hash = hash as string;
        else resources.push({ type: 'lora', name, hash: hash as string });
      }
      delete metadata['Lora hashes'];
    }

    // Extract VAE
    if (metadata['VAE hash']) {
      if (!metadata.hashes) metadata.hashes = {};
      metadata.hashes['vae'] = metadata['VAE hash'] as string;
      delete metadata['VAE hash'];
    }

    // Extract Model hash
    if (metadata['Model'] && metadata['Model hash']) {
      if (!metadata.hashes) metadata.hashes = {};
      if (!metadata.hashes['model']) metadata.hashes['model'] = metadata['Model hash'] as string;

      resources.push({
        type: 'model',
        name: metadata['Model'] as string,
        hash: metadata['Model hash'] as string,
      });
    }

    // Extract hypernetwork details
    if (metadata['Hypernet'] && metadata['Hypernet strength']) {
      resources.push({
        type: 'hypernet',
        name: metadata['Hypernet'] as string,
        weight: parseFloat(metadata['Hypernet strength'] as string),
      });
    }

    if (metadata['AddNet Enabled'] === 'True') {
      let i = 1;
      while (true) {
        const fullname = metadata[`AddNet Model ${i}`] as string;
        if (!fullname) break;
        const [, name, hash] = fullname.match(automaticNameHash) ?? [];

        resources.push({
          type: (metadata[`AddNet Module ${i}`] as string).toLowerCase(),
          name,
          hash,
          weight: parseFloat(metadata[`AddNet Weight ${i}`] as string),
        });
        i++;
      }
    }

    metadata.resources = resources;

    return metadata;
  },
  
  encode({ prompt, negativePrompt, resources, steps, ...other }: Record<string, any>) {
    const lines = [prompt];
    if (negativePrompt) lines.push(`Negative prompt: ${negativePrompt}`);
    const fineDetails = [];
    if (steps) fineDetails.push(`Steps: ${steps}`);
    for (const [k, v] of Object.entries(other)) {
      const key = automaticSDEncodeMap.get(k) ?? k;
      if (excludedKeys.includes(key)) continue;
      fineDetails.push(`${key}: ${v}`);
    }
    if (fineDetails.length > 0) lines.push(fineDetails.join(', '));

    return lines.join('\n');
  },
};
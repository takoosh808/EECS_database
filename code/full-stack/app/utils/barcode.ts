export interface ParsedBarcode {
  serialNumber: string;
  name?: string;
  location?: string;
  description?: string;
}

export function parseBarcode(raw: string): ParsedBarcode | null {
  const [serial, name, location, ...descriptionParts] = raw
    .split("|")
    .map((part) => part.trim());

  if (!serial) return null;

  const description = descriptionParts.filter(Boolean).join(" | ");

  return {
    serialNumber: serial,
    ...(name ? { name } : {}),
    ...(location ? { location } : {}),
    ...(description ? { description } : {}),
  };
}
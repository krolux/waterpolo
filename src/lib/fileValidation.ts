const SAFE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function assertSafeImage(file: File, maxBytes = 10 * 1024 * 1024) {
  if (!SAFE_IMAGE_TYPES.has(file.type)) {
    throw new Error("Dozwolone są wyłącznie obrazy JPG, PNG lub WebP.");
  }
  if (file.size <= 0 || file.size > maxBytes) {
    throw new Error(`Plik obrazu może mieć maksymalnie ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }
}

export function assertSafePdf(file: File, maxBytes = 20 * 1024 * 1024) {
  if (file.type !== "application/pdf") throw new Error("Wybierz plik PDF.");
  if (file.size <= 0 || file.size > maxBytes) {
    throw new Error(`Plik PDF może mieć maksymalnie ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }
}

export async function hasPdfSignature(file: File) {
  const prefix = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...prefix) === "%PDF-";
}

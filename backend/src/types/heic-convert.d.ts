declare module "heic-convert" {
  interface HeicConvertOptions {
    buffer: Buffer;
    format: "JPEG" | "PNG";
    quality?: number;
  }

  export default function convert(options: HeicConvertOptions): Promise<Buffer | Uint8Array>;
}

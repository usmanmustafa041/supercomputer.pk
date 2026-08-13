/**
 * What an uploaded file actually is, decided from its bytes.
 *
 * Nothing here trusts the request. The filename and the Content-Type on an
 * upload are both whatever the client chose to send, so a file named photo.jpg
 * containing a shell script arrives labelled image/jpeg. The only honest source
 * is the file's own header, which the format fixes.
 */

export const ACCEPTED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export interface Inspection {
  mime: string;
  extension: string;
  width: number | null;
  height: number | null;
}

/** The magic bytes at the front of each format we accept. */
export function sniff(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

/**
 * Pixel dimensions, read out of the header.
 *
 * Worth the parsing: with width and height known the page can reserve the right
 * box before the photograph arrives, so the layout does not jump as images load
 * in. Everything needed is in the first few dozen bytes of each format, so this
 * costs nothing next to decoding the image.
 */
export function dimensions(buf: Buffer, mime: string): { width: number; height: number } | null {
  try {
    if (mime === "image/png") {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }

    if (mime === "image/jpeg") {
      // Walk the marker segments to a start-of-frame marker, the only place a
      // JPEG records its size.
      let i = 2;
      while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) {
          i++;
          continue;
        }
        const marker = buf[i + 1];
        // C0 to CF are frame headers, apart from C4 (Huffman tables), C8 and CC.
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
        }
        if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
          i += 2;
          continue;
        }
        i += 2 + buf.readUInt16BE(i + 2);
      }
      return null;
    }

    // WebP comes in three flavours and each stores its size differently.
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8 ") {
      return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    }
    if (chunk === "VP8L") {
      const bits = buf.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8X") {
      // Three bytes each, little endian, stored one less than the real value.
      const w = buf[24] | (buf[25] << 8) | (buf[26] << 16);
      const h = buf[27] | (buf[28] << 8) | (buf[29] << 16);
      return { width: w + 1, height: h + 1 };
    }
    return null;
  } catch {
    // A truncated or unusual file: not worth failing the upload over, the
    // photograph just loads without a reserved box.
    return null;
  }
}

/** Both checks together, or null if these are not bytes we will accept. */
export function inspect(buf: Buffer): Inspection | null {
  const mime = sniff(buf);
  if (!mime || !ACCEPTED_MIME[mime]) return null;
  const size = dimensions(buf, mime);
  return {
    mime,
    extension: ACCEPTED_MIME[mime],
    width: size?.width ?? null,
    height: size?.height ?? null,
  };
}

import { db, pictureUploadsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { ObjectStorageService } from "./objectStorage";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const pictureStorage = new ObjectStorageService();

export class PictureInputError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function requirePictureStorage() {
  if (!process.env.PRIVATE_OBJECT_DIR) {
    throw new PictureInputError(503, "Picture storage is not available yet. You can still type your question. Please try uploading again once storage has been connected.");
  }
}

function detectImageType(buffer: Buffer): string | null {
  if (buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (buffer.length > 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return "image/jpeg";
  if (buffer.length > 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

export async function readOwnedPicture(objectPath: string, userId: string) {
  requirePictureStorage();
  if (!/^\/objects\/uploads\/[a-zA-Z0-9-]+$/.test(objectPath)) {
    throw new PictureInputError(400, "Invalid picture reference.");
  }
  const [record] = await db.select().from(pictureUploadsTable).where(
    and(eq(pictureUploadsTable.objectPath, objectPath), eq(pictureUploadsTable.userId, userId)),
  );
  if (!record) throw new PictureInputError(404, "Picture not found in your uploads. Please attach it again.");
  const file = await pictureStorage.getObjectEntityFile(objectPath);
  const [metadata] = await file.getMetadata();
  const size = Number(metadata.size);
  if (!Number.isFinite(size) || size <= 0 || size > MAX_IMAGE_BYTES || size !== record.size) {
    throw new PictureInputError(400, "The uploaded picture must match the selected file and be at most 8 MB.");
  }
  const chunks: Buffer[] = [];
  let total = 0;
  // Bound the actual read too: the signed PUT URL can remain valid after metadata was checked.
  for await (const chunk of file.createReadStream({ end: MAX_IMAGE_BYTES })) {
    const bytes = Buffer.from(chunk);
    total += bytes.length;
    if (total > MAX_IMAGE_BYTES) throw new PictureInputError(400, "Picture exceeds the 8 MB limit.");
    chunks.push(bytes);
  }
  const buffer = Buffer.concat(chunks);
  const contentType = detectImageType(buffer);
  if (!contentType || contentType !== record.contentType || total !== record.size) {
    throw new PictureInputError(400, "Please upload a valid PNG, JPEG, or WebP picture.");
  }
  return { buffer, contentType };
}

import { Readable } from "node:stream";
import { Router, type IRouter } from "express";
import { RequestUploadUrlBody, RequestUploadUrlResponse } from "@workspace/api-zod";
import { db, pictureUploadsTable } from "@workspace/db";
import { and, eq, gte, count } from "drizzle-orm";
import { ObjectNotFoundError } from "../lib/objectStorage";
import { PictureInputError, pictureStorage, readOwnedPicture, requirePictureStorage } from "../lib/picture-input";

const router: IRouter = Router();

router.post("/storage/uploads/request-url", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Please log in to upload private pictures." });
    return;
  }
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose a PNG, JPEG, or WebP picture no larger than 8 MB." });
    return;
  }
  try {
    requirePictureStorage();
    const [recent] = await db.select({ total: count() }).from(pictureUploadsTable).where(and(
      eq(pictureUploadsTable.userId, req.user.id),
      gte(pictureUploadsTable.createdAt, new Date(Date.now() - 60 * 60 * 1000)),
    ));
    if ((recent?.total ?? 0) >= 20) {
      res.status(429).json({ error: "You have reached 20 picture uploads this hour. Please try again later." });
      return;
    }
    const uploadURL = await pictureStorage.getObjectEntityUploadURL();
    const objectPath = pictureStorage.normalizeObjectEntityPath(uploadURL);
    await db.insert(pictureUploadsTable).values({
      objectPath, userId: req.user.id, size: parsed.data.size, contentType: parsed.data.contentType,
    });
    res.json(RequestUploadUrlResponse.parse({ uploadURL, objectPath }));
  } catch (error) {
    if (error instanceof PictureInputError) { res.status(error.status).json({ error: error.message }); return; }
    req.log.warn("Picture upload URL generation failed");
    res.status(503).json({ error: "Private picture storage is temporarily unavailable. Please try again later or type your question." });
  }
});

router.get("/storage/objects/*path", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Please log in to view this picture." }); return; }
  const raw = req.params.path;
  const path = `/objects/${Array.isArray(raw) ? raw.join("/") : raw}`;
  try {
    const { buffer, contentType } = await readOwnedPicture(path, req.user.id);
    res.set({ "Content-Type": contentType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
    res.send(buffer);
  } catch (error) {
    if (error instanceof PictureInputError) { res.status(error.status).json({ error: error.message }); return; }
    if (error instanceof ObjectNotFoundError) { res.status(404).json({ error: "Picture not found. Please upload it again." }); return; }
    req.log.warn("Private picture retrieval failed");
    res.status(503).json({ error: "Picture storage is temporarily unavailable." });
  }
});

router.get("/storage/public-objects/*filePath", async (req, res): Promise<void> => {
  const raw = req.params.filePath;
  const filePath = Array.isArray(raw) ? raw.join("/") : raw;
  if (!filePath || filePath.split("/").some(part => part === "." || part === "..")) {
    res.status(400).json({ error: "Invalid file path." }); return;
  }
  try {
    if (!process.env.PUBLIC_OBJECT_SEARCH_PATHS) { res.status(404).json({ error: "File not found." }); return; }
    const file = await pictureStorage.searchPublicObject(filePath);
    if (!file) { res.status(404).json({ error: "File not found." }); return; }
    const response = await pictureStorage.downloadObject(file);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (response.body) {
      Readable.fromWeb(response.body as ReadableStream<Uint8Array>).on("error", () => res.destroy()).pipe(res);
    } else { res.end(); }
  } catch {
    req.log.warn("Public file retrieval failed");
    res.status(503).json({ error: "File storage is temporarily unavailable." });
  }
});

export default router;

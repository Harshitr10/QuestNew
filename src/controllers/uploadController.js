import fs from "fs";
import path from "path";
import { getDB } from "../config/dbConnection.js";

export const uploadImages = async (req, res) => {
  try {
    const { envId } = req.body;
    if (!envId) {
      return res.status(400).json({ error: "envId is required" });
    }

    const db = getDB();
    const pendingCollection = db.collection("pending");

    // Base directory for storage
    const baseDir = "/home/harshit/Desktop/quest_test";
    const targetDir = path.join(baseDir, `pending_${envId}`);
    const imagesDir = path.join(targetDir, "images");

    // If folder already exists → delete it
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }

    // Recreate folders
    fs.mkdirSync(imagesDir, { recursive: true });

    // Save uploaded files into "images" folder
    req.files.forEach((file, index) => {
      const newFilename = `${Date.now()}_${index}_${file.originalname}`;
      const newPath = path.join(imagesDir, newFilename);
      fs.renameSync(file.path, newPath);
    });

    // Prepare single DB record (no per-file data)
    const record = {
      envId,
      folderPath: imagesDir,
      status: "PENDING",
      createdAt: new Date(),
    };

    // Insert single record (replace old if envId exists)
    await pendingCollection.updateOne(
      { envId },
      { $set: record },
      { upsert: true } // creates if not exists
    );

    res.json({
      message: "✅ Images uploaded & saved to DB",
      data: record,
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

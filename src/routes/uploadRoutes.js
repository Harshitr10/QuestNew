import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { uploadImages } from "../controllers/uploadController.js";
import { getStatus } from "../controllers/statusController.js";

const router = express.Router();

// ensure uploads folder exists
const IMAGE_DIR = path.join(process.cwd(), "src/uploads");
if (!fs.existsSync(IMAGE_DIR)) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

// multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, IMAGE_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "_" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

router.post("/upload", upload.array("images"), uploadImages);

router.get("/status", getStatus);
export default router;

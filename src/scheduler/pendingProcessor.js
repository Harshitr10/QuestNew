import cron from "node-cron";
import { getDB } from "../config/dbConnection.js";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";

const PHOTOGRAMMETRY_BIN = "/Users/swapac/Downloads/CreatingAPhotogrammetryCommandLineApp/HelloPhotogrammetry 2025-08-12 15-54-51/Products/usr/local/bin/HelloPhotogrammetry";

export const startPendingProcessor = () => {
  cron.schedule("*/20 * * * *", async () => {
    console.log("⏳ Scheduler triggered...");
    const db = getDB();
    const pendingCollection = db.collection("pending");

    try {
      const record = await pendingCollection.findOne(
        { status: "PENDING" },
        { sort: { _id: 1 } }
      );

      if (!record) {
        console.log("✅ No pending records found.");
        return;
      }

      const folderPath = record.folderPath;
      const envFolder = path.dirname(folderPath);
      const usdzPath = path.join(envFolder, `${record.envId}.usdz`);
      const glbPath = path.join(envFolder, `${record.envId}.glb`);

      console.log(`⚡ Processing envId=${record.envId}`);

      const photogrammetryCmd = `"${PHOTOGRAMMETRY_BIN}" "${folderPath}" "${envFolder}" -d preview -o sequential -f normal`;

      exec(photogrammetryCmd, (err, stdout, stderr) => {
        if (err) {
          console.error(" Photogrammetry error:", stderr);
          pendingCollection.updateOne(
            { _id: record._id },
            { $set: { status: "FAILED", error: stderr } }
          );
          return;
        }

        console.log(" Photogrammetry success");

        const usd2gltfCmd = `usd2gltf -i "${usdzPath}" -o "${glbPath}"`;

        exec(usd2gltfCmd, async (err2, stdout2, stderr2) => {
          if (err2) {
            console.error(" usd2gltf error:", stderr2);
            await pendingCollection.updateOne(
              { _id: record._id },
              { $set: { status: "FAILED", error: stderr2 } }
            );
            return;
          }

          console.log(" GLB conversion success");

          try {
            const formData = new FormData();
            formData.append("file", fs.createReadStream(glbPath));
            formData.append("scanName", record.scanName || "defaultScan");
            formData.append("environmentId", record.envId);

            await axios.post(
              "https://mystical-backend.onrender.com/api/scans",
              formData,
              { headers: formData.getHeaders() }
            );

            await pendingCollection.updateOne(
              { _id: record._id },
              {
                $set: {
                  status: "COMPLETED",
                  usdzPath,
                  glbPath,
                  scanName: record.scanName || "defaultScan",
                  completedAt: new Date(),
                },
              }
            );

            console.log(`envId=${record.envId} processing complete`);
          } catch (apiErr) {
            console.error(" API upload error:", apiErr.message);
            await pendingCollection.updateOne(
              { _id: record._id },
              { $set: { status: "FAILED", error: apiErr.message } }
            );
          }
        });
      });
    } catch (error) {
      console.error(" Scheduler error:", error);
    }
  });
};

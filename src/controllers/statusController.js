import { getDB } from "../config/dbConnection.js";

export const getStatus = async (req, res) => {
  try {
    const envId = req.headers["envid"];
    if (!envId) {
      return res.status(400).json({ error: "Missing envId in headers" });
    }

    const db = getDB();
    const pendingCollection = db.collection("pending");

    const record = await pendingCollection.findOne({ envId });

    if (!record) {
      return res.status(404).json({ error: "Record not found" });
    }

    res.json({
      envId: record.envId,
      status: record.status,
      usdzPath: record.usdzPath || null,
      glbPath: record.glbPath || null,
      scanName: record.scanName || null,
      error: record.error || null,
      completedAt: record.completedAt || null,
    });
  } catch (err) {
    console.error("Error fetching status:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

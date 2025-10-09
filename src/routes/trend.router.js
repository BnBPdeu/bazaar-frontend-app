// routes/trend.router.js
import { Router } from "express";
import { startSectorTrend, stopSectorTrend } from "../utils/trendControl.js";
import { trendState } from "../utils/trendState.js";
import { News } from "../models/news.models.js";
import { emitLatestNews } from "../controllers/trading.controllers.js";

const router = Router();

/**
 * Start a sector trend
 * Body:
 * {
 *   "sector": "Automobile",
 *   "changePercent": 3,       // +3 means +3% up; -3 for down
 *   "durationSec": 120        // optional, default 60
 * }
 */
router.post("/sector", async(req, res) => {
  try {
    const { title, description, sector, changePercent, durationSec } = req.body || {};
    if (!sector || typeof changePercent !== "number") {
      return res
        .status(400)
        .json({ ok: false, msg: "sector and changePercent are required" });
    }

    const result = startSectorTrend({ sector, changePercent, durationSec });

    const newsItem = {
      title,
      description,
      sector,
      changePercent,
      durationSec,
      timestamp: new Date(),
    };

    const io = req.app.get("io");
    io.emit("sectorNews", newsItem);

    const newsArray = await News.create({
      title,
      description,
      sector,
      changePercent,
      durationSec,
    })
     

    if(!newsArray){
      return res.status(402).json({ msg : "news not come"});
    }
    
    await emitLatestNews();
    // Emit news via socket
    return res.json({ ok: true, trend: result.trendState, news: newsItem ,newsArray });
  } catch (e) {
    console.error("❌ /trend/sector error:", e);
    return res.status(500).json({ ok: false, msg: "internal error" });
  }
});

/** Stop (cancel) any active trend */
router.post("/stop", (req, res) => {
  try {
    const result = stopSectorTrend();
    return res.json({ ok: true, trend: result });
  } catch (e) {
    console.error("❌ /trend/stop error:", e);
    return res.status(500).json({ ok: false, msg: "internal error" });
  }
});

/** Peek state (optional) */
router.get("/state", (req, res) => res.json({ ok: true, trendState }));

export default router;

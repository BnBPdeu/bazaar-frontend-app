import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectToDatabase } from "./src/db/db.js";
import { createServer } from "http";
import { Server } from "socket.io";
import cron from "node-cron";
import { simulatePrices } from "./src/controllers/share.controller.js";
import { simulateIPOPrices } from "./src/controllers/ipo.controllers.js";
import nodemailer from "nodemailer";
import {
  leaderBoardData,
  sendrelizedPLToSocket,
  sendunrelizedPLToSocket,
} from "./src/controllers/trading.controllers.js";

//import models

import { Shares } from "./src/models/share.models.js";
// import { News } from "./src/models/News.models.js";
import { marketTrend } from "./src/utils/marketState.js";

//import routes
import { userRouter } from "./src/routes/user.router.js";
import { shareRouter } from "./src/routes/share.router.js";
import { tradingRouter } from "./src/routes/trading.router.js";
// import { newsRouter } from "./src/routes/news.router.js";
import { google } from "googleapis";
import { ipoRouter } from "./src/routes/ipo.router.js";
import { trendState } from "./src/utils/trendState.js";
import trendRouter from "./src/routes/trend.router.js";
import { simulateSectorTrend } from "./src/utils/simulateSectorTrend.js";
import { emitLatestNews } from "./src/controllers/trading.controllers.js";

const app = express();
dotenv.config({});
const port = process.env.PORT || 4000;
const server = createServer(app);

// cron function change price in every 5 second

//instance of socket

const io = new Server(server, {
  cors: {
    origin: [
      "https://bazaar-admin-production.up.railway.app",
      "https://bazaar-frontend-app-production.up.railway.app",
      "http://localhost:3000",
      "http://localhost:4000",
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:8080",
      "http://localhost:8081",
    ],
    methods: ["GET", "POST"],
  },
});

// ADD A COMMENT

app.set("io", io);
// cors options
const corsOptions = {
  origin: [
    "https://bazaar-admin-production.up.railway.app",
    "https://bazaar-frontend-app-production.up.railway.app",
    "http://localhost:3000",
    "http://localhost:4000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:8080",
    "http://localhost:8081",
  ],
  credentials: true,
  methods: "GET, POST, DELETE, PATCH, HEAD, PUT, OPTIONS",
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Access-Control-Allow-Credentials",
    "cache-control",
    "svix-id",
    "svix-timestamp",
    "svix-signature",
  ],
  exposedHeaders: ["Authorization"],
};

// default middelwares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.static("/tmp", { index: false }));
// make io available on req in controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.get("/", (req, res) => {
  res.status(200).json({ msg: "backend is running" });
});

// Keep track of which sockets subscribed to which shares
const subscriptions = new Map(); // socket.id -> shareId

let isBreak = false;

io.on("connection", async (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  // connection for all breake and start game
  socket.emit("break_state", { isBreak });
  socket.on("toggle_break", () => {
    isBreak = !isBreak;
    io.emit("break_state", { isBreak }); // ✅ broadcast to everyone
    console.log(`Break mode: ${isBreak}`);
  });

  socket.on("registerUser", (userId) => {
    socket.join(userId); // 🔑 Now this socket is in the userId room
    console.log(`📌 ${socket.id} joined room for user ${userId}`);
  });

  socket.on("market_prices", async ({ livePrices, userId }) => {
    try {
      // Basic validation to catch bad payloads early
      if (!userId) {
        console.warn("market_prices missing userId");
        return;
      }
      if (
        !livePrices ||
        (typeof livePrices !== "object" && !Array.isArray(livePrices))
      ) {
        console.warn("market_prices livePrices must be object map or array");
        return;
      }

      // await sendrelizedPLToSocket(io, userId, livePrices);
      await sendunrelizedPLToSocket(io, userId, livePrices);
    } catch (err) {
      console.error("market_prices handler error:", err);
    }
  });
  // User subscribes to a specific share
  socket.on("subscribeShareHistory", (shareId) => {
    subscriptions.set(socket.id, shareId);
    console.log(`📌 ${socket.id} subscribed to ${shareId}`);
  });

  // User unsubscribes
  socket.on("unsubscribeShareHistory", () => {
    subscriptions.delete(socket.id);
    console.log(`❌ ${socket.id} unsubscribed`);
  });

  socket.on("disconnect", () => {
    subscriptions.delete(socket.id);
    console.log(`❌ User disconnected: ${socket.id}`);
  });

  await leaderBoardData(io);

  // Listen for client requests
  socket.on("request-top-users", async () => {
    await leaderBoardData(io);
  });

  await emitLatestNews(io);

});

// Global cron job to update candles + send history

// in top-level scope (above cron): keep track of news already applied to DB to avoid repeated application

cron.schedule("*/8 * * * * *", async () => {
  if (isBreak) {
    console.log("⏸ Break active, skipping price simulation...");
    return;
    
  }
 
  // await simulateIPOPrices(io);

  if (trendState.active) {
    await simulateSectorTrend(io);
  } else {
    await simulatePrices(io);
  }

  // await simulatePrices(io);

  for (const [socketId, shareId] of subscriptions.entries()) {
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) continue;

    try {
      const share = await Shares.findById(shareId, {
        shareName: 1,
        history: { $slice: -1 },
      }).lean();

      if (share) {
        socket.emit("shareHistoryData", {
          shareId,
          sharename: share.shareName,
          history: share.history,
          mode: trendState.active ? "trend" : marketTrend.mode, // 👈 add this
        });
      }
    } catch (err) {
      console.error("❌ Error sending live history:", err);
    }
  }
});

// cron.schedule("*/5 * * * * *", async () => {
//   await simulateIPOPrices(io);
// });

////////////////////////////////
//                            //
//     BACKEND API ROUTES     //
//                            //
////////////////////////////////

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use("/ipo", ipoRouter);
app.use("/api/share", shareRouter);
app.use("/api/trade", tradingRouter);
app.use("/api/user", userRouter);
app.use("/trend", trendRouter);

connectToDatabase().then(() => {
  server.listen(port, () => {
    console.log(`app is running on port : ${port}`);
  });
});

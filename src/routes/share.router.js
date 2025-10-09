import { Router } from "express";
import { addshare ,sendcandleData ,getMarketTrend } from "../controllers/share.controller.js";
import { AdminVerify } from "../middlewares/auth.middlewares.js";
export const shareRouter = new Router();

shareRouter.route("/addshare").post(AdminVerify,addshare);
shareRouter.route("/candle-data/:shareId").get(sendcandleData);
shareRouter.route("/marketTrend").post(AdminVerify,getMarketTrend)
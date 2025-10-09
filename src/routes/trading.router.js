import { Router } from "express";
import {
  BuyShare,
  sellShare,
  getTradeHistory,
  addBalanceToAll,
  getallTrade,
  addBalanceToUser,
  dropHistoryField,
  dropAllHistory,
  squareOff,
  shortSell,
  coverShort,
  getRealizedPL,
} from "../controllers/trading.controllers.js";
import { getRealizedPLController } from "../controllers/realized.controller.js";
import { AdminVerify, authVerify } from "../middlewares/auth.middlewares.js";
export const tradingRouter = new Router();

tradingRouter.route("/buy").post(authVerify, BuyShare);
tradingRouter.route("/sell").post(authVerify, sellShare);
tradingRouter.route("/squareoff").post(authVerify, squareOff);
tradingRouter.route("/addtoallbalance").post(AdminVerify, addBalanceToAll);
tradingRouter.route("/addbalance").post(AdminVerify, addBalanceToUser);
tradingRouter.route("/getalltrade").get(AdminVerify, getallTrade);
tradingRouter.route("/realized/:userId").get(authVerify, getRealizedPLController);
tradingRouter.route("/tradehistory/:userId").get(authVerify, getTradeHistory);
tradingRouter.route("/drop-share/:shareId").delete(dropHistoryField);
tradingRouter.route("/drop-all-history").post(dropAllHistory);
tradingRouter.route("/short-sell").post(shortSell);
tradingRouter.route("/cover-short").post(coverShort);

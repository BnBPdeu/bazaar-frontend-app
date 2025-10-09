import { Router } from "express";
import {
  register,
  login,
  passwordOtp,
  verifyEmail,
  resetPassword,
  getAllUser,
  getUser,
  changeDetail,
  logout,
} from "../controllers/user.controllers.js";

import { AdminVerify, authVerify } from "../middlewares/auth.middlewares.js";
export const userRouter = new Router();

userRouter.route("/signup").post(register);
userRouter.route("/login").post(login);
userRouter.post("/otp-for-password", passwordOtp);
userRouter.post("/verify-email", verifyEmail);
userRouter.post("/reset-password", resetPassword);
userRouter.route("/me/:userId").get(authVerify, getUser);
userRouter.route("/alluser").get(AdminVerify, getAllUser);
userRouter.route("/changeDetail").post(authVerify, changeDetail);
userRouter.route("/logout").post(logout);

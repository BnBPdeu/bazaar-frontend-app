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
import passport from "../config/passport-config.js";
import { User } from "../models/user.models.js";
export const userRouter = new Router();

const isProd = process.env.NODE_ENV === "production";

userRouter.get(
  "/auth/google",
  (req, res, next) => {
    console.log("Using callback:", process.env.GOOGLE_CALLBACK_URL);
    next();
  },
  passport.authenticate("google", {
    scope: ["openid", "profile", "email"],
    // scope:
    //   "https://www.googleapis.com/auth/userinfo.profile openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/user.birthday.read https://www.googleapis.com/auth/user.birthday.read https://www.googleapis.com/auth/user.gender.read https://www.googleapis.com/auth/user.phonenumbers.read",
  }),
);

userRouter.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/api/user/auth/failure",
    failureMessage: true,
  }),
  async (req, res, next) => {
    try {
      const accessToken = await req.user.generateAuthToken();
      const refreshToken = await req.user.generateRefreshToken();

      const userExists = await User.findById(req.user._id.toString());

      if (!userExists) {
        return res
          .status(500)
          .json(new ApiError(500, "Authentication Failure"));
      }

      userExists.accessToken = accessToken;

      await userExists.save();

      /**
       * Re-change later
       */

      res.cookie("authToken", refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "None" : "Lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.redirect(`${process.env.FRONTEND_URL}/verify-token/?token=${accessToken}`);
    } catch (error) {
      console.error(error);
      next(error);
    }
  },
);

userRouter.get("/auth/failure", (req, res) => {
  const error = req.session.messages?.[0];

  console.log(error);

  if (error?.code === "EMAIL_ALREADY_EXISTS") {
    return res.status(409).json({
      success: false,
      error: {
        code: "EMAIL_ALREADY_EXISTS",
        message: "Account already exists. Please log in instead.",
      },
    });
  }

  res.status(400).json({
    success: false,
    error: {
      code: "OAUTH_FAILED",
      message: "Google authentication failed",
    },
  });
});

userRouter.route("/signup").post(register);
userRouter.route("/login").post(login);
userRouter.post("/otp-for-password", passwordOtp);
userRouter.post("/verify-email", verifyEmail);
userRouter.post("/reset-password", resetPassword);
userRouter.route("/me/:userId").get(authVerify, getUser);
userRouter.route("/alluser").get(AdminVerify, getAllUser);
userRouter.route("/changeDetail").post(authVerify, changeDetail);
userRouter.route("/logout").post(logout);

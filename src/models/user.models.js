import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const ShortPositionSchema = new mongoose.Schema({
  shareId: { type: String },
  sharename: { type: String, required: true },
  quantity: { type: Number, required: true },
  sellPrice: { type: Number, required: true }, // price at which user shorted
  marginLocked: { type: Number, required: true }, // full position value locked
  createdAt: { type: Date, default: Date.now },
});

const TradeSchema = new mongoose.Schema({
  sharename: String,
  type: String, // SHORT_SELL or SHORT_COVER
  quantity: Number,
  price: Number,
  createdAt: { type: Date, default: Date.now },
});

const tradeSchema = new mongoose.Schema({
  sharename: { type: String, required: true },
  type: {
    type: String,
    enum: ["BUY", "SELL", "SHORT_SELL", "SHORT_COVER"],
    required: true,
  },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true }, // price per share
  timestamp: { type: Date, default: Date.now },
});

export const Trade = mongoose.model("Trade", tradeSchema);

const portfolioSchema = new mongoose.Schema({
  shareId: { type: String, required: false },
  sharename: { type: String, required: true },
  quantity: { type: Number, required: true },
  avgPrice: { type: Number, required: true },
  lastMarketPrice: { type: Number, default: 0 }, // updated via live prices
});

export const Portfolio = mongoose.model("Portfolio", portfolioSchema);

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      required: false,
    },
    Email: {
      type: String,
      required: true,
    },
    accessToken: {
      type: String,
      required: false,
    },
    profilePic: {
      type: String,
      required: false,
    },
    googleId: {
      type: String,
      required: false,
    },
    phone_number: {
      type: String,
      sparse: true,
    },
    dob: Date,
    Password: {
      type: String,
      required: false,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
    },
    otpExpiry: {
      type: Date,
    },
    TotalBalance: {
      type: Number,
      required: true,
      default: 500000,
    },
    blockedBalance: { type: Number, default: 0 },
    portfolio: [portfolioSchema],
    trades: [tradeSchema],
    shortPositions: [ShortPositionSchema],
  },
  { timestamps: true },
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("Password")) return next();
  this.Password = await bcrypt.hash(this.Password, 10);
  next();
});

/******************** Generate Access Token ********************/
userSchema.methods.generateAuthToken = async function () {
  try {
    return jwt.sign(
      {
        userId: this._id.toString(),
        email: this.Email,
        isAdmin: this.isAdmin,
      },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: "15m",
      },
    );
  } catch (error) {
    console.log(`${error}`);
  }
};

/******************** Generate Refresh Token ********************/
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      userId: this._id.toString(),
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" },
  ); // 7 days
};

userSchema.methods.comparePassword = async function (Password) {
  return bcrypt.compare(Password, this.Password);
};

export const User = mongoose.model("User", userSchema);

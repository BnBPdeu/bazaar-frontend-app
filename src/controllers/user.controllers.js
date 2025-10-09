import { User } from "../models/user.models.js";
import { user, Loginuser } from "../utils/validator.js";
import bcrypt from "bcrypt";
import { passwordOtpEmail } from "../utils/password-reset.js";
import axios, { Axios } from "axios";

export const register = async (req, res) => {
  try {
    const parsed = await user.safeParse(req.body);
    // console.log(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 400,
        // message: parsed.error.errors[0].message
      });
    }

    const { fullName, Email, Password } = parsed.data;

    if (!fullName || !Email || !Password) {
      return res.status(402).json({ msg: "all fields are required ..." });
    }
    const ExistedUser = await User.findOne({ Email });
    if (ExistedUser) {
      return res.status(202).json({ msg: "user already existed" });
    }

    const newuser = await User.create({
      fullName,
      Email,
      Password,
    });

    if (!newuser) {
      return res.status(402).json({ msg: "newuser failed" });
    }

    const response = await axios.post(
      `${process.env.EMAIL_SERVICE_URL}/send-email`,
      {
        to: Email,
        type: "welcome-email",
      }
    );

    console.log(response)

    return res.status(200).json({ msg: "user created!!!", newuser });
  } catch (error) {
    console.log(error);
  }
};

export const login = async (req, res) => {
  try {
    const parsed = await Loginuser.safeParse(req.body);
    // console.log(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: 400,
        message: parsed.error.errors[0].message,
      });
    }

    const { Email, Password } = parsed.data;
    if (!Email || !Password) {
      return res.status(404).json("all fields are required");
    }

    const userExists = await User.findOne({ Email });
    if (!userExists) {
      return res.status(400).json({ msg: "Invalid Credentials" });
    }
    const user = await userExists.comparePassword(Password);
    // console.log(user);
    const token = await userExists.generateAuthToken();
    // console.log(token);

    const option = {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 12 * 60 * 60 * 1000,
      // secure: process.env.NODE_ENV === "production",
      secure: false, // Set to true if using HTTPS
    };

    if (user) {
      res.status(200).cookie("authToken", token, option).json({
        message: "Login successful",
        token,
        userId: userExists._id.toString(),
        isAdmin: userExists.isAdmin,
      });
    } else {
      res.status(401).json({ message: "Invalid Email or password." });
    }
  } catch (error) {
    console.log(error);
  }
};

export const passwordOtp = async (req, res) => {
  const { Email } = req.body;

  try {
    const user = await User.findOne({ Email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    // Save OTP and expiry
    user.otp = hashedOtp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP Email
    // await passwordOtpEmail(Email, otp);
    const response = await axios.post(
      `${process.env.EMAIL_SERVICE_URL}/send-email`,
      {
        to: Email,
        otp: otp,
        type: "otp-request",
      }
    );

    console.log(response);

    return res.status(200).json({
      success: true,
      message: "OTP sent to your Email",
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const resetPassword = async (req, res) => {
  const { Email, newPassword } = req.body;

  try {
    // Find the user by Email
    const user = await User.findOne({ Email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    await User.findOneAndUpdate({ Email }, { Password: hashedPassword });

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error(`Error during password reset: ${error}`);
    return res.status(500).json({
      success: false,
      message: "Password reset failed",
      error: error.message,
    });
  }
};

export const verifyEmail = async (req, res) => {
  const { Email, userOtp } = req.body;

  try {
    // Find user by Email
    const user = await User.findOne({ Email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if OTP has expired
    if (user.otpExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    // Compare the submitted OTP with stored hashed OTP
    const isOtpValid = await bcrypt.compare(userOtp, user.otp);

    if (isOtpValid) {
      await User.findOneAndUpdate(
        { Email },
        {
          isVerified: true,
          otp: null,
          OtpExpiry: null,
        }
      );

      return res.status(200).json({
        success: true,
        message: "OTP Verified Successfully",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }
  } catch (error) {
    console.error(`Error during OTP verification: ${error}`);
    return res.status(500).json({
      success: false,
      message: "OTP Verification failed",
      error,
    });
  }
};

export const getAllUser = async (req, res) => {
  try {
    const users = await User.find().select("fullName Email ");
    if (!users.length) {
      return res.status(404).json({ msg: "users not found" });
    }

    return res.status(200).json({ msg: "user found", users });
  } catch (error) {
    console.log(error);
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    // console.log(user);
    if (!user) {
      return res.status(400).json({ msg: "User not found" });
    }
    return res.status(200).json({ message: "User found", user });
  } catch (error) {
    console.error("Error in getUser:", error);
    return res.status(500).json({ msg: "Internal server error", error });
  }
};

export const changeDetail = async (req, res) => {
  try {
    const { userId, userName, Password } = req.body;

    if (!userId) {
      return res.status(400).json({ msg: "userId is required" });
    }

    const updates = {};
    if (userName) {
      updates.fullName = userName;
    }
    if (Password) {
      const hashedPassword = await bcrypt.hash(Password, 10);
      updates.Password = hashedPassword;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ msg: "No fields to update" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password"); // hide password in response

    if (!updatedUser) {
      return res.status(404).json({ msg: "User not found" });
    }

    return res.status(200).json({ msg: "Details updated successfully" });
  } catch (error) {
    console.error("Error updating details:", error);
    res.status(500).json({ msg: "Internal server error" });
  }
};

export const logout = async (req, res) => {
  try {
    res
      .clearCookie("authToken", { path: "/" })
      .clearCookie("refreshToken", { path: "/" })
      .status(200)
      .json({ message: "Logged out successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Logout failed" });
  }
};

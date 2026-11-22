import { z } from "zod";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import mongoose from "mongoose";
import User from "../models/User.js";
import { isSupabaseConfigured } from "../config/supabase.js";
import { signToken } from "../utils/token.js";
import { sendResetPasswordEmail } from "../services/emailService.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long")
});

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required")
});

function checkDBConnection() {
  if (isSupabaseConfigured()) {
    return;
  }
  if (mongoose.connection.readyState !== 1) {
    const error = new Error("Database is currently unavailable. Please ensure database connection is active.");
    error.status = 503;
    throw error;
  }
}

export async function register(req, res, next) {
  try {
    checkDBConnection();
    const { name, email: rawEmail, password } = registerSchema.parse(req.body);
    const email = rawEmail.toLowerCase();
    
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const user = await User.create({
      name,
      email,
      password,
      isVerified: true,
      role: "HR"
    });

    res.status(201).json({ token: signToken(user), user: sanitize(user) });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    checkDBConnection();
    const { email, password } = loginSchema.parse(req.body);
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: "Your account has been suspended by an Administrator." });
    }

    res.json({ token: signToken(user), user: sanitize(user) });
  } catch (error) {
    next(error);
  }
}

export async function googleLogin(req, res, next) {
  try {
    checkDBConnection();
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: "Google ID token is required." });

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const { sub: googleId, email, name } = ticket.getPayload();

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      user = await User.create({
        googleId,
        email,
        name,
        isVerified: true,
        password: crypto.randomBytes(16).toString("hex"),
        role: "HR"
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      user.isVerified = true;
      await user.save();
    }

    res.json({ token: signToken(user), user: sanitize(user) });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    checkDBConnection();
    const { email: rawEmail } = z.object({ email: z.string().email("Valid email required") }).parse(req.body);
    const email = rawEmail.toLowerCase();
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "No user found with this email." });

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    await sendResetPasswordEmail(email, token);
    res.json({ message: "Password reset link sent to your email." });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    checkDBConnection();
    const { token, password } = z.object({
      token: z.string().min(1, "Reset token is required"),
      password: z.string().min(8, "New password must be at least 8 characters long")
    }).parse(req.body);

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired password reset link." });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful. You can now sign in." });
  } catch (error) {
    next(error);
  }
}

export async function me(req, res) {
  res.json({ user: sanitize(req.user) });
}

export async function updateProfile(req, res, next) {
  try {
    checkDBConnection();
    const { name, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found." });

    if (name && name.trim().length >= 2) user.name = name.trim();
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ message: "Current password is required to set a new password." });
      const valid = await user.comparePassword(currentPassword);
      if (!valid) return res.status(400).json({ message: "Current password is incorrect." });
      if (newPassword.length < 8) return res.status(400).json({ message: "New password must be at least 8 characters long." });
      user.password = newPassword;
    }
    await user.save();
    res.json({ user: sanitize(user) });
  } catch (error) {
    next(error);
  }
}

function sanitize(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive !== false
  };
}

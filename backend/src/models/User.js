import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { isSupabaseConfigured } from "../config/supabase.js";
import { SupabaseUser } from "./supabaseAdapter.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ["Admin", "HR"], default: "HR" },
    isActive: { type: Boolean, default: true },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    googleId: { type: String, unique: true, sparse: true },
    isVerified: { type: Boolean, default: false }
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const MongoUser = mongoose.models.User || mongoose.model("User", userSchema);

const UserProxy = new Proxy(MongoUser, {
  get(target, prop) {
    if (isSupabaseConfigured() && prop in SupabaseUser) {
      return SupabaseUser[prop];
    }
    return target[prop];
  },
  construct(target, args) {
    if (isSupabaseConfigured()) {
      const data = args[0] || {};
      const instance = {
        _id: data._id || data.id,
        id: data.id || data._id,
        ...data,
        comparePassword: async (pass) => bcrypt.compare(pass, instance.password),
        save: async () => {
          if (!instance._id) {
            const created = await SupabaseUser.create(instance);
            Object.assign(instance, created);
            return instance;
          }
          return SupabaseUser.create(instance);
        }
      };
      return instance;
    }
    return new target(...args);
  }
});

export default UserProxy;

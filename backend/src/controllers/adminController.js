import { z } from "zod";
import Candidate from "../models/Candidate.js";
import Job from "../models/Job.js";
import User from "../models/User.js";

const createHRSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  role: z.enum(["HR", "Admin"]).default("HR")
});

const updateHRSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().email().optional(),
  role: z.enum(["HR", "Admin"]).optional(),
  password: z.string().min(8).optional(),
  isActive: z.boolean().optional()
});

export async function getHRStats(req, res, next) {
  try {
    const users = await User.find().select("-password -__v").sort("-createdAt").lean();

    const stats = await Promise.all(
      users.map(async (user) => {
        const candidateCount = await Candidate.countDocuments({ uploadedBy: user._id });
        const jobCount = await Job.countDocuments({ createdBy: user._id });
        const shortlistedCount = await Candidate.countDocuments({ uploadedBy: user._id, shortlisted: true });

        return {
          ...user,
          candidateCount,
          jobCount,
          shortlistedCount
        };
      })
    );

    res.json({ hrStats: stats });
  } catch (error) {
    next(error);
  }
}

export async function createHRUser(req, res, next) {
  try {
    const { name, email: rawEmail, password, role } = createHRSchema.parse(req.body);
    const email = rawEmail.toLowerCase();

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const newUser = await User.create({
      name,
      email,
      password,
      role: role || "HR",
      isVerified: true,
      isActive: true
    });

    res.status(201).json({
      message: `${role || "HR"} account created successfully.`,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateHRUser(req, res, next) {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const updates = updateHRSchema.parse(req.body);

    if (updates.email && updates.email !== user.email) {
      const emailTaken = await User.findOne({ email: updates.email.toLowerCase(), _id: { $ne: id } });
      if (emailTaken) return res.status(409).json({ message: "Email is already taken by another account." });
      user.email = updates.email.toLowerCase();
    }

    if (updates.name) user.name = updates.name.trim();
    if (updates.role) user.role = updates.role;
    if (typeof updates.isActive === "boolean") {
      // Prevent admin from deactivating themselves
      if (user._id.toString() === req.user._id.toString() && !updates.isActive) {
        return res.status(400).json({ message: "You cannot deactivate your own admin account." });
      }
      user.isActive = updates.isActive;
    }
    if (updates.password) {
      user.password = updates.password;
    }

    await user.save();

    res.json({
      message: "Account updated successfully.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleHRStatus(req, res, next) {
  try {
    const { id } = req.params;
    if (id === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot change the status of your own account." });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found." });

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      message: `User ${user.name} is now ${user.isActive ? "Active" : "Suspended"}.`,
      isActive: user.isActive
    });
  } catch (error) {
    next(error);
  }
}

export async function reassignHRData(req, res, next) {
  try {
    const { fromUserId, toUserId } = req.body;
    if (!fromUserId || !toUserId) {
      return res.status(400).json({ message: "Source and target user IDs are required." });
    }

    const [sourceUser, targetUser] = await Promise.all([
      User.findById(fromUserId),
      User.findById(toUserId)
    ]);

    if (!sourceUser || !targetUser) {
      return res.status(404).json({ message: "Source or target user not found." });
    }

    const [candidateResult, jobResult] = await Promise.all([
      Candidate.updateMany({ uploadedBy: fromUserId }, { uploadedBy: toUserId }),
      Job.updateMany({ createdBy: fromUserId }, { createdBy: toUserId })
    ]);

    res.json({
      message: `Reassigned ${candidateResult.modifiedCount} candidate(s) and ${jobResult.modifiedCount} job(s) from ${sourceUser.name} to ${targetUser.name}.`,
      reassignedCandidates: candidateResult.modifiedCount,
      reassignedJobs: jobResult.modifiedCount
    });
  } catch (error) {
    next(error);
  }
}

export async function getHRActivity(req, res, next) {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });

    const [candidates, jobs] = await Promise.all([
      Candidate.find({ uploadedBy: id }).select("name email skills experienceYears stage shortlisted createdAt"),
      Job.find({ createdBy: id }).select("title department status minExperienceYears requiredSkills createdAt")
    ]);

    res.json({ user, candidates, jobs });
  } catch (error) {
    next(error);
  }
}

export async function deleteHRUser(req, res, next) {
  try {
    const { id } = req.params;
    const { reassignToAdmin = true } = req.body || {};

    if (id === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot delete your own admin account." });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (reassignToAdmin) {
      // Reassign all their data to the deleting Admin so work is not lost
      await Promise.all([
        Candidate.updateMany({ uploadedBy: id }, { uploadedBy: req.user._id }),
        Job.updateMany({ createdBy: id }, { createdBy: req.user._id })
      ]);
    } else {
      await Promise.all([
        Candidate.deleteMany({ uploadedBy: id }),
        Job.deleteMany({ createdBy: id })
      ]);
    }

    await User.findByIdAndDelete(id);

    res.json({
      message: `User ${user.name} deleted successfully.${reassignToAdmin ? " Associated candidates and jobs reassigned to Admin." : ""}`
    });
  } catch (error) {
    next(error);
  }
}

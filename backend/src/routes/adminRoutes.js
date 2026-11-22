import express from "express";
import { 
  createHRUser,
  deleteHRUser, 
  getHRActivity,
  getHRStats, 
  reassignHRData,
  toggleHRStatus, 
  updateHRUser 
} from "../controllers/adminController.js";
import { protect, restrictTo } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("Admin"));

router.get("/hr-stats", getHRStats);
router.post("/hr", createHRUser);
router.patch("/hr/:id", updateHRUser);
router.patch("/hr/:id/toggle-status", toggleHRStatus);
router.get("/hr/:id/activity", getHRActivity);
router.post("/hr/reassign", reassignHRData);
router.delete("/hr/:id", deleteHRUser);

export default router;

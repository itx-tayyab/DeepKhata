import express from 'express';
import { profileInfo, businessInfo, updateBusinessInfo, updateProfileInfo } from '../controllers/settingControllers.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';
import { getSettingsLimiter, updateSettingsLimiter } from '../middlewares/ratelimitterMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

router.get("/profileinfo", authenticate, getSettingsLimiter, profileInfo);

router.get("/businessinfo", authenticate, requirePermission("manage:business"), getSettingsLimiter, businessInfo);

router.put('/business', authenticate, requirePermission("manage:business"), upload.single('logo'),updateSettingsLimiter,updateBusinessInfo);

router.put('/profile', authenticate, upload.single('avatar'), updateSettingsLimiter, updateProfileInfo);


export default router;
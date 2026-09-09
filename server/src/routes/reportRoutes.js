import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { ReportsLimiter } from '../middlewares/ratelimitterMiddleware.js';
import { getFinancialOverview, getInventoryInsights, getStaffPerformance, getCustomerInsights } from '../controllers/reportControllers.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

router.get("/financial", authenticate, requirePermission("read:reports"), ReportsLimiter, getFinancialOverview);
router.get("/inventory", authenticate, requirePermission("read:reports"), ReportsLimiter, getInventoryInsights);
router.get("/staff", authenticate, requirePermission("read:reports"), ReportsLimiter, getStaffPerformance);
router.get("/customers", authenticate, requirePermission("read:reports"), ReportsLimiter, getCustomerInsights);

export default router;
import express from 'express';
import { newOrder, getAllOrders, getOrderById, updateOrderStatus, recordPayment, getPublicInvoice } from '../controllers/orderControllers.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { newOrderLimiter, getAllOrdersLimiter, OrderDetailsLimiter, OrderUpdateLimiter } from '../middlewares/ratelimitterMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

router.post("/neworder", authenticate, requirePermission("create:order"), newOrderLimiter, newOrder);

router.get("/getallorders", authenticate, requirePermission("read:orders"), getAllOrdersLimiter, getAllOrders);
router.get("/:id", authenticate, requirePermission("read:orders"), OrderDetailsLimiter, getOrderById);
router.patch("/:id/status", authenticate, requirePermission("update:order"), OrderUpdateLimiter, updateOrderStatus);
router.post("/recordpayment", authenticate, requirePermission("update:order"), recordPayment);

router.get('/public/invoice/:id', getPublicInvoice);

export default router;
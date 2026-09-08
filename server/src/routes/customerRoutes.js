import express from 'express';
import { newCustomer, CustomerDetails, CustomerRisk, getallCustomers, getCustomerById } from '../controllers/customerControllers.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { newCustomerLimiter, CustomerDetailsLimiter, CustomerRiskLimiter, GetAllCustomerLimiter } from '../middlewares/ratelimitterMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

router.post("/newcustomer", authenticate, requirePermission("write:customers"), newCustomerLimiter, newCustomer);

router.put("/customerdetails/:id", authenticate, requirePermission("write:customers"), CustomerDetailsLimiter, CustomerDetails);

router.patch("/customerrisk/:id", authenticate, requirePermission("manage:risk"), CustomerRiskLimiter, CustomerRisk);

router.get("/getallcustomers", authenticate, requirePermission("read:customers"), GetAllCustomerLimiter, getallCustomers);

router.get("/:id", authenticate, requirePermission("read:customers"), CustomerDetailsLimiter, getCustomerById);

export default router;
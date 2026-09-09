import express from 'express';
import { addCategory, addProduct, getCategories, getProducts } from '../controllers/productControllers.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { categoryLimiter, addProductLimiter, getProductsLimiter, getCategoriesLimiter } from '../middlewares/ratelimitterMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

router.post("/addcategory", authenticate, requirePermission("write:products"), categoryLimiter, addCategory);
router.post("/addproduct", authenticate, requirePermission("write:products"), addProductLimiter, addProduct);

router.get("/getproducts", authenticate, requirePermission("read:products"), getProductsLimiter, getProducts);
router.get("/getcategories", authenticate, getCategoriesLimiter, getCategories);

//router.delete("/deleteproduct/:id", authenticate, requirePermission("delete:products"), deleteProduct);

export default router;
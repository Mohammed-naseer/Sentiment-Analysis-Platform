import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
} from '../controllers/productController';
import { verifyToken, verifyAdmin, authorizeRoles } from '../middleware/auth';

const router = Router();

// All product routes require authentication
router.use(verifyToken);

// Read: Admin, Analyst, Viewer
router.get('/', authorizeRoles('Admin', 'Analyst', 'Viewer'), getProducts);
router.get('/:id', authorizeRoles('Admin', 'Analyst', 'Viewer'), getProductById);
router.get('/:id/stats', authorizeRoles('Admin', 'Analyst', 'Viewer'), getProductStats);

// Write: Admin and Analyst only
router.post('/', authorizeRoles('Admin', 'Analyst'), createProduct);
router.put('/:id', authorizeRoles('Admin', 'Analyst'), updateProduct);

// Delete: Admin only
router.delete('/:id', verifyAdmin, deleteProduct);

export default router;

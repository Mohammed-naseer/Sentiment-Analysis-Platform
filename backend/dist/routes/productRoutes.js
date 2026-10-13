"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const productController_1 = require("../controllers/productController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All product routes require authentication
router.use(auth_1.verifyToken);
// Read: Admin, Analyst, Viewer
router.get('/', (0, auth_1.authorizeRoles)('Admin', 'Analyst', 'Viewer'), productController_1.getProducts);
router.get('/:id', (0, auth_1.authorizeRoles)('Admin', 'Analyst', 'Viewer'), productController_1.getProductById);
router.get('/:id/stats', (0, auth_1.authorizeRoles)('Admin', 'Analyst', 'Viewer'), productController_1.getProductStats);
// Write: Admin and Analyst only
router.post('/', (0, auth_1.authorizeRoles)('Admin', 'Analyst'), productController_1.createProduct);
router.put('/:id', (0, auth_1.authorizeRoles)('Admin', 'Analyst'), productController_1.updateProduct);
// Delete: Admin only
router.delete('/:id', auth_1.verifyAdmin, productController_1.deleteProduct);
exports.default = router;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profileController_1 = require("../controllers/profileController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
// GET /api/profile - Retrieve details of active profile
router.get('/', auth_1.verifyToken, profileController_1.getProfile);
// PUT /api/profile - Modify name and image parameters
router.put('/', auth_1.verifyToken, validation_1.profileUpdateValidation, profileController_1.updateProfile);
exports.default = router;

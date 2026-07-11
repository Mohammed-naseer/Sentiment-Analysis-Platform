"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Routes mapped to controllers and validation middlewares
router.post('/register', validation_1.registerValidation, authController_1.register);
router.post('/login', validation_1.loginValidation, authController_1.login);
router.post('/google', validation_1.googleLoginValidation, authController_1.googleLogin);
router.post('/logout', authController_1.logout);
exports.default = router;

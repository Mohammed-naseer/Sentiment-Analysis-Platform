import { Router } from 'express';
import { register, login, googleLogin, logout } from '../controllers/authController';
import { registerValidation, loginValidation, googleLoginValidation } from '../middleware/validation';

const router = Router();

// Routes mapped to controllers and validation middlewares
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/google', googleLoginValidation, googleLogin);
router.post('/logout', logout);

export default router;

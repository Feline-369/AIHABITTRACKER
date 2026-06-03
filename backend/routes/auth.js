import express from 'express';
import { login, register, me, UpdateProfile, googleAuth } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', protect, me);
router.put('/me', protect, UpdateProfile);

export default router;

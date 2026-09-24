import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter, deviceLimiter, refreshLimiter } from '../middleware/rateLimiters.js';
import { validate } from '../middleware/validate.js';
import {
  loginValidator,
  deviceOptionsValidator,
  deviceVerifyValidator,
  unlockValidator,
  refreshValidator,
  changePasswordValidator,
  changeUsernameValidator,
  updateProfileValidator,
} from '../validators/auth.validator.js';

const router = Router();

router.post('/login', authLimiter, validate(loginValidator), authController.login);
router.post('/device/options', deviceLimiter, validate(deviceOptionsValidator), authController.deviceOptions);
router.post('/device/verify', deviceLimiter, validate(deviceVerifyValidator), authController.deviceVerify);
router.post('/refresh', refreshLimiter, validate(refreshValidator), authController.refresh);
router.post('/logout', authenticate, authController.logout);

router.post('/unlock', authLimiter, authenticate, validate(unlockValidator), authController.unlock);
router.get('/me', authenticate, authController.me);
router.put('/me/profile', authenticate, validate(updateProfileValidator), authController.updateProfile);
router.put('/me/password', authenticate, validate(changePasswordValidator), authController.changePassword);
router.put('/me/username', authenticate, validate(changeUsernameValidator), authController.changeUsername);

export default router;

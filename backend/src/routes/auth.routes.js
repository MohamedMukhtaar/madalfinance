import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter, refreshLimiter } from '../middleware/rateLimiters.js';
import { validate } from '../middleware/validate.js';
import {
  loginValidator,
  refreshValidator,
  changePasswordValidator,
  changeUsernameValidator,
  updateProfileValidator,
} from '../validators/auth.validator.js';

const router = Router();

router.post('/login', authLimiter, validate(loginValidator), authController.login);
router.post('/refresh', refreshLimiter, validate(refreshValidator), authController.refresh);
router.post('/logout', authenticate, authController.logout);

router.get('/me', authenticate, authController.me);
router.put('/me/profile', authenticate, validate(updateProfileValidator), authController.updateProfile);
router.put('/me/password', authenticate, validate(changePasswordValidator), authController.changePassword);
router.put('/me/username', authenticate, validate(changeUsernameValidator), authController.changeUsername);

export default router;

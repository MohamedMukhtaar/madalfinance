import { Router } from 'express';
import settingsController from '../controllers/settings.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { uploadLimiter } from '../middleware/rateLimiters.js';
import { singleUpload } from '../helpers/fileHelper.js';
import { updateSettingsValidator } from '../validators/settings.validator.js';
import { P, SETTINGS_WRITE } from '../utils/constants.js';

const router = Router();
router.use(authenticate);

router.get('/dashboard', authorize(P.view('dashboard')), settingsController.dashboardStats);
router.get('/', authorize(P.view('organizations'), P.manage('settings'), P.view('dashboard')), settingsController.getSettings);
router.put('/', authorize(...SETTINGS_WRITE), validate(updateSettingsValidator), settingsController.updateSettings);
router.post('/logo', authorize(...SETTINGS_WRITE), uploadLimiter, singleUpload('logos'), settingsController.uploadLogo);
router.delete('/logo', authorize(...SETTINGS_WRITE), settingsController.removeLogo);

export default router;

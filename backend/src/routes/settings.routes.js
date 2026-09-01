import { Router } from 'express';
import settingsController from '../controllers/settings.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { uploadLimiter } from '../middleware/rateLimiters.js';
import { singleUpload } from '../helpers/fileHelper.js';
import { updateSettingsValidator } from '../validators/settings.validator.js';
import { APP_ACCESS, SETTINGS_WRITE } from '../utils/constants.js';

const router = Router();
router.use(authenticate);
router.use(authorize(...APP_ACCESS));

router.get('/', settingsController.getSettings);
router.get('/dashboard', settingsController.dashboardStats);
router.put('/', authorize(...SETTINGS_WRITE), validate(updateSettingsValidator), settingsController.updateSettings);
router.post('/logo', authorize(...SETTINGS_WRITE), uploadLimiter, singleUpload('logos'), settingsController.uploadLogo);
router.delete('/logo', authorize(...SETTINGS_WRITE), settingsController.removeLogo);

export default router;

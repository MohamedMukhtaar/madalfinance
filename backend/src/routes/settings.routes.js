import { Router } from 'express';
import settingsController from '../controllers/settings.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { updateSettingsValidator } from '../validators/settings.validator.js';
import { ROLES } from '../utils/constants.js';

const router = Router();
router.use(authenticate);

router.get('/', settingsController.getSettings);
router.get('/dashboard', settingsController.dashboardStats);
router.put('/', authorize(ROLES.SUPER_ADMIN), validate(updateSettingsValidator), settingsController.updateSettings);

export default router;

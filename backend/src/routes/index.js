import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import customerRoutes from './customer.routes.js';
import projectRoutes from './project.routes.js';
import contractRoutes from './contract.routes.js';
import invoiceRoutes from './invoice.routes.js';
import paymentRoutes from './payment.routes.js';
import rentalRoutes from './rental.routes.js';
import contributionRoutes from './contribution.routes.js';
import expenseRoutes from './expense.routes.js';
import incomeRoutes from './income.routes.js';
import transactionRoutes from './transaction.routes.js';
import reportRoutes from './report.routes.js';
import settingsRoutes from './settings.routes.js';
import filesRoutes from './files.routes.js';
import publicRoutes from './public.routes.js';
import trashRoutes from './trash.routes.js';
import accountRoutes from './account.routes.js';
import employeeRoutes from './employee.routes.js';
import salaryRoutes from './salary.routes.js';

const router = Router();

router.get('/health', (_req, res) =>
  res.json({ success: true, message: 'Finance system API is healthy', data: { status: 'ok' } })
);

router.use('/public', publicRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/customers', customerRoutes);
router.use('/projects', projectRoutes);
router.use('/contracts', contractRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/payments', paymentRoutes);
router.use('/rentals', rentalRoutes);
router.use('/contributions', contributionRoutes);
router.use('/expenses', expenseRoutes);
router.use('/income', incomeRoutes);
router.use('/transactions', transactionRoutes);
router.use('/reports', reportRoutes);
router.use('/accounts', accountRoutes);
router.use('/employees', employeeRoutes);
router.use('/salary', salaryRoutes);
router.use('/settings', settingsRoutes);
router.use('/trash', trashRoutes);
router.use('/files', filesRoutes);

export default router;

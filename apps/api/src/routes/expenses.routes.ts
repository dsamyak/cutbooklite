import { Router } from 'express';
import { addExpense, getExpenses, updateExpense, deleteExpense } from '../controllers/expenses.controller';
import { authenticate, requireRole, requireSubscription } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireRole('OWNER'));
router.use(requireSubscription);

router.post('/', addExpense);
router.get('/', getExpenses);
router.patch('/:id', updateExpense);
router.delete('/:id', deleteExpense);

export default router;

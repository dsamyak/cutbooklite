import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import salonsRoutes from './routes/salons.routes';
import servicesRoutes from './routes/services.routes';
import expensesRoutes from './routes/expenses.routes';
import earningsRoutes from './routes/earnings.routes';
import subscriptionRoutes from './routes/subscription.routes';
import { errorHandler } from './middleware/error';

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/v1/auth', authRoutes);
app.use('/v1/salons', salonsRoutes);
app.use('/v1/services', servicesRoutes);
app.use('/v1/expenses', expensesRoutes);
app.use('/v1/earnings', earningsRoutes);
app.use('/v1/subscription', subscriptionRoutes);

app.get('/', (req, res) => {
  res.send('Salon Management SaaS API is running');
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

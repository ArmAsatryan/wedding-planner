import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import guestRoutes from './routes/guests.js';
import expenseRoutes from './routes/expenses.js';
import tableRoutes from './routes/tables.js';
import invitationRoutes from './routes/invitations.js';
import scheduleRoutes from './routes/schedule.js';
import memberRoutes from './routes/members.js';
import { EXPENSE_CATEGORY_LABELS } from './lib/constants.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Wedding Planner API-ն աշխատում է' });
});

app.get('/api/expense-categories', (_req, res) => {
  res.json(EXPENSE_CATEGORY_LABELS);
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/guests', guestRoutes);
app.use('/api/projects/:projectId/expenses', expenseRoutes);
app.use('/api/projects/:projectId/tables', tableRoutes);
app.use('/api/projects/:projectId/invitations', invitationRoutes);
app.use('/api/projects/:projectId/schedule', scheduleRoutes);
app.use('/api/projects/:projectId/members', memberRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Ներքին սերվերի սխալ' });
});

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🎊 Wedding Planner API-ն աշխատում է http://localhost:${PORT}-ում`);
  });
}

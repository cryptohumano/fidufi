import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Routes
import actorsRouter from './routes/actors';
import assetsRouter from './routes/assets';
import trustsRouter from './routes/trusts';
import alertsRouter from './routes/alerts';
import authRouter from './routes/auth';
import adminRouter from './routes/admin';
import actorTrustRouter from './routes/actorTrust';
import auditLogsRouter from './routes/auditLogs';
import comiteSessionsRouter from './routes/comiteSessions';
import monthlyStatementsRouter from './routes/monthlyStatements';
import exceptionVotesRouter from './routes/exceptionVotes';
import assetTemplatesRouter from './routes/assetTemplates';
import contributionsRouter from './routes/contributions';
import budgetItemsRouter from './routes/budgetItems';
import expensesRouter from './routes/expenses';
import fiduciaryAccountsRouter from './routes/fiduciaryAccounts';
import contractDocumentsRouter from './routes/contractDocuments';
import insurancePoliciesRouter from './routes/insurancePolicies';
import milestonesRouter from './routes/milestones';
import approvalPoliciesRouter from './routes/approvalPolicies';
import unitsRouter from './routes/units';
import saleProcessesRouter from './routes/saleProcesses';
import checklistRouter from './routes/checklist';
import trustConceptsRouter from './routes/trustConcepts';
import { authenticate } from './middleware/auth';
import { getTrustTypes } from './services/trustService';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/actors', actorsRouter);
app.use('/api/assets', assetsRouter);
// Tipos de fideicomiso: ruta explícita para evitar que GET /api/trusts/types sea capturada por /:trustId
app.get('/api/trusts/types', authenticate, async (_req, res) => {
  try {
    const types = await getTrustTypes();
    res.json(types);
  } catch (err: any) {
    res.status(400).json({ error: err?.message ?? 'Error al cargar tipos' });
  }
});
app.use('/api/trusts', trustsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/actor-trust', actorTrustRouter);
app.use('/api/audit-logs', auditLogsRouter);
app.use('/api/comite-sessions', comiteSessionsRouter);
app.use('/api/monthly-statements', monthlyStatementsRouter);
app.use('/api/exception-votes', exceptionVotesRouter);
app.use('/api/asset-templates', assetTemplatesRouter);
app.use('/api/contributions', contributionsRouter);
app.use('/api/budget-items', budgetItemsRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/fiduciary-accounts', fiduciaryAccountsRouter);
app.use('/api/contract-documents', contractDocumentsRouter);
app.use('/api/insurance-policies', insurancePoliciesRouter);
app.use('/api/milestones', milestonesRouter);
app.use('/api/approval-policies', approvalPoliciesRouter);
app.use('/api/units', unitsRouter);
app.use('/api/sale-processes', saleProcessesRouter);
app.use('/api/checklist', checklistRouter);
app.use('/api/trust-concepts', trustConceptsRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'fidufi API',
    version: '1.0.0',
    description: 'Capa de cumplimiento técnico para fideicomisos irrevocables',
    endpoints: {
      health: '/health',
      actors: '/api/actors',
      assets: '/api/assets',
      trusts: '/api/trusts',
      alerts: '/api/alerts',
    },
  });
});

app.listen(PORT, () => {
  console.log(`🚀 fidufi API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API docs: http://localhost:${PORT}/`);
});

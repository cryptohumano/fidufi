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
app.use('/api/trusts', trustsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/actor-trust', actorTrustRouter);

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

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createApiRouter } from './controllers/ApiController.js';
import { seedMasterData } from '../infrastructure/database/seeder.js';
import { DatabaseConnection } from '../infrastructure/database/DatabaseConnection.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', createApiRouter());

// Serve static frontend build if present
const clientDistPath = path.resolve(process.cwd(), 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order-to-Audit Factory API</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; }
            .card { background: #1e293b; padding: 24px; border-radius: 8px; max-width: 800px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
            h1 { color: #38bdf8; }
            a { color: #38bdf8; text-decoration: none; }
            code { background: #0f172a; padding: 2px 6px; border-radius: 4px; color: #f43f5e; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>🌾 Order-to-Audit Food Manufacturing System</h1>
            <p>NIT Tiruchirappalli Winter Internship Benchmark Prototype</p>
            <p>API endpoints are active at <code>/api</code>.</p>
            <ul>
              <li><a href="/api/items">/api/items</a> - Master Items with Real-time Balances</li>
              <li><a href="/api/inventory/summary">/api/inventory/summary</a> - Double-entry Stock Summary</li>
              <li><a href="/api/inventory/ledger">/api/inventory/ledger</a> - Complete Stock Ledger Audit Trail</li>
              <li><a href="/api/orders">/api/orders</a> - Field Orders</li>
              <li><a href="/api/invoices">/api/invoices</a> - GST Tax Invoices</li>
              <li><a href="/api/reports/dashboard">/api/reports/dashboard</a> - Owner Executive KPIs</li>
            </ul>
            <p>To run benchmark verification from CLI: <code>npm run benchmark</code></p>
          </div>
        </body>
      </html>
    `);
  });
}

// Auto-seed database if empty on startup
try {
  const db = DatabaseConnection.getInstance();
  const itemCount = db.prepare('SELECT COUNT(*) as count FROM items').get() as { count: number };
  if (itemCount.count === 0) {
    console.log('Database empty. Running initial master data seeding...');
    seedMasterData().catch(console.error);
  }
} catch (e) {
  console.error('Error during startup database check:', e);
}

const HOST = process.env.HOST || '127.0.0.1';

app.listen(PORT, HOST, () => {
  console.log(`================================================================`);
  console.log(`🏭 Smart Food Manufacturer Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Benchmark Runner API ready at POST http://${HOST}:${PORT}/api/benchmark/run`);
  console.log(`================================================================`);
});

export default app;

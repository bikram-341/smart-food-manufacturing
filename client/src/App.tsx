import React, { useState } from 'react';
import type { UserRole } from './types';
import { Navbar } from './components/Navbar';
import { SalesmanPortal } from './components/SalesmanPortal';
import { AdminPortal } from './components/AdminPortal';
import { ProductionPortal } from './components/ProductionPortal';
import { AuditorPortal } from './components/AuditorPortal';
import { OwnerDashboard } from './components/OwnerDashboard';
import { BenchmarkRunner } from './components/BenchmarkRunner';

export const App: React.FC = () => {
  const [activeRole, setActiveRole] = useState<UserRole>('BENCHMARK');
  const [isReseeding, setIsReseeding] = useState<boolean>(false);

  const handleReseed = async () => {
    if (!confirm('Reset all transactions and re-seed Section 5 master data?')) return;
    setIsReseeding(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      if (res.ok) {
        alert('Database successfully reset and re-seeded to initial benchmark master data!');
        window.location.reload();
      }
    } catch (e) {
      alert('Failed to reset database');
    } finally {
      setIsReseeding(false);
    }
  };

  return (
    <div className="app-layout">
      <Navbar
        activeRole={activeRole}
        onSelectRole={setActiveRole}
        onReseed={handleReseed}
        isReseeding={isReseeding}
      />

      <main style={{ minHeight: 'calc(100vh - 70px)', paddingBottom: 40 }}>
        {activeRole === 'BENCHMARK' && <BenchmarkRunner />}

        {activeRole === 'SALESMAN_A' && (
          <SalesmanPortal
            salesmanId="usr_sales_a"
            salesmanName="Karthik (Salesman A - Tamil Nadu)"
            defaultCustomerState="33"
          />
        )}

        {activeRole === 'SALESMAN_B' && (
          <SalesmanPortal
            salesmanId="usr_sales_b"
            salesmanName="Suresh (Salesman B - Karnataka)"
            defaultCustomerState="29"
          />
        )}

        {activeRole === 'ADMIN' && <AdminPortal />}

        {activeRole === 'PRODUCTION' && <ProductionPortal />}

        {activeRole === 'AUDITOR' && <AuditorPortal />}

        {activeRole === 'OWNER' && <OwnerDashboard />}
      </main>
    </div>
  );
};

export default App;

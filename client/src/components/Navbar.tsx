import React from 'react';
import type { UserRole } from '../types';
import { Smartphone, Monitor, Factory, FileSpreadsheet, PieChart, PlayCircle, RefreshCw } from 'lucide-react';

interface NavbarProps {
  activeRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onReseed: () => void;
  isReseeding: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeRole, onSelectRole, onReseed, isReseeding }) => {
  return (
    <header className="app-header">
      <div className="logo-area">
        <div className="logo-badge">🌾</div>
        <div className="logo-text">
          <h1>Sri Krishna Foods • Order-to-Audit</h1>
          <span>NIT Tiruchirappalli Winter Internship Task • Factory in Tamil Nadu</span>
        </div>
      </div>

      <nav className="role-switcher">
        <button
          className={`role-btn ${activeRole === 'SALESMAN_A' ? 'active' : ''}`}
          onClick={() => onSelectRole('SALESMAN_A')}
          title="Salesman A Mobile View (Tamil Nadu)"
        >
          <Smartphone size={14} /> Salesman A (TN)
        </button>

        <button
          className={`role-btn ${activeRole === 'SALESMAN_B' ? 'active' : ''}`}
          onClick={() => onSelectRole('SALESMAN_B')}
          title="Salesman B Mobile View (Karnataka - Inter-state)"
        >
          <Smartphone size={14} /> Salesman B (KA)
        </button>

        <button
          className={`role-btn ${activeRole === 'ADMIN' ? 'active' : ''}`}
          onClick={() => onSelectRole('ADMIN')}
          title="Factory Admin Billing & Dispatch Desk"
        >
          <Monitor size={14} /> Factory Admin
        </button>

        <button
          className={`role-btn ${activeRole === 'PRODUCTION' ? 'active' : ''}`}
          onClick={() => onSelectRole('PRODUCTION')}
          title="Production Floor & Recipe BOM Logging"
        >
          <Factory size={14} /> Production Floor
        </button>

        <button
          className={`role-btn ${activeRole === 'AUDITOR' ? 'active' : ''}`}
          onClick={() => onSelectRole('AUDITOR')}
          title="Auditor & CA Reports (GSTR, Registers, Ledger)"
        >
          <FileSpreadsheet size={14} /> Auditor / Reports
        </button>

        <button
          className={`role-btn ${activeRole === 'OWNER' ? 'active' : ''}`}
          onClick={() => onSelectRole('OWNER')}
          title="Executive KPI Summary"
        >
          <PieChart size={14} /> Owner
        </button>

        <button
          className={`role-btn benchmark-btn ${activeRole === 'BENCHMARK' ? 'active' : ''}`}
          onClick={() => onSelectRole('BENCHMARK')}
          title="Run Mandatory Section 5 Benchmark Scenario"
        >
          <PlayCircle size={14} /> Benchmark Suite
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={onReseed}
          disabled={isReseeding}
          title="Reset and reload Section 5 master data"
          style={{ marginLeft: 8 }}
        >
          <RefreshCw size={12} className={isReseeding ? 'animate-spin' : ''} />
          {isReseeding ? 'Resetting...' : 'Reset'}
        </button>
      </nav>
    </header>
  );
};

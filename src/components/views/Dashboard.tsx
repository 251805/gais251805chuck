import React, { useState, useEffect } from 'react';
import Sidebar from '../layout/Sidebar';
import PurchaseRequestForm from '../forms/PurchaseRequestForm';
import RISRequestForm from '../forms/RISRequestForm';
import InventoryView from './InventoryView';
import StatusChecker from './StatusChecker';
import AdminApprovalView from './AdminApprovalView';
import WarehouseView from './WarehouseView';
import ReportsView from './ReportsView';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Dashboard() {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState('pr');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Set default tab based on role once it's available
  useEffect(() => {
    if (role === 'ADMIN' || role === 'ROOT') {
      setActiveTab('approval');
    } else if (role === 'WAREHOUSE') {
      setActiveTab('delivery');
    } else {
      setActiveTab('pr');
    }
  }, [role]);

  const renderContent = () => {
    switch (activeTab) {
      case 'pr': return <PurchaseRequestForm />;
      case 'ris': return <RISRequestForm />;
      case 'status': return <StatusChecker />;
      case 'approval': return <AdminApprovalView />;
      case 'inventory': return <InventoryView />;
      case 'delivery': return <WarehouseView />;
      case 'reports': return <ReportsView />;
      default: return <PurchaseRequestForm />;
    }
  };

  return (
    <div className="flex bg-slate-50 min-h-screen relative">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 bg-slate-900 text-white rounded-lg shadow-lg"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className={`${isSidebarOpen ? 'block' : 'hidden'} lg:block fixed lg:static inset-0 z-40`}>
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        <div className="h-full">
          <Sidebar activeTab={activeTab} setActiveTab={(tab) => { setActiveTab(tab); setIsSidebarOpen(false); }} />
        </div>
      </div>
      <main className="flex-1 overflow-y-auto">
        <div className="lg:hidden h-16" /> {/* Spacer for mobile menu */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

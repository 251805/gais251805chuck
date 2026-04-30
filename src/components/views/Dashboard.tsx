import React, { useState } from 'react';
import Sidebar from '../layout/Sidebar';
import PurchaseRequestForm from '../forms/PurchaseRequestForm';
import RISRequestForm from '../forms/RISRequestForm';
import InventoryView from './InventoryView';
import StatusChecker from './StatusChecker';
import { motion, AnimatePresence } from 'motion/react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('pr');

  const renderContent = () => {
    switch (activeTab) {
      case 'pr': return <PurchaseRequestForm />;
      case 'ris': return <RISRequestForm />;
      case 'status': return <StatusChecker />;
      case 'inventory': return <InventoryView />;
      default: return <PurchaseRequestForm />;
    }
  };

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto">
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

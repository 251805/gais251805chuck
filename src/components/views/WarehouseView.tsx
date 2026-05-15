import React, { useState } from 'react';
import DRRequestForm from '../forms/DRRequestForm';
import RISIssueForm from '../forms/RISIssueForm';
import { motion, AnimatePresence } from 'motion/react';
import { Truck, PackageSearch } from 'lucide-react';

export default function WarehouseView() {
  const [activeTab, setActiveTab] = useState<'DR' | 'RIS'>('DR');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-slate-50 min-h-screen p-4 md:p-8"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-3xl border border-slate-200 w-fit shadow-sm">
          <button
            onClick={() => setActiveTab('DR')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black transition-all ${
              activeTab === 'DR' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Truck size={18} />
            <span>DELIVERY RECEIPTS (IN)</span>
          </button>
          <button
            onClick={() => setActiveTab('RIS')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black transition-all ${
              activeTab === 'RIS' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <PackageSearch size={18} />
            <span>RIS ISSUANCE (OUT)</span>
          </button>
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'DR' ? <DRRequestForm /> : <RISIssueForm />}
        </motion.div>
      </div>
    </motion.div>
  );
}

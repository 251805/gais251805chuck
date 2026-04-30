import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { GSOIDRecord } from '../../types';
import { Search, Loader2, Clock, CheckCircle2, AlertCircle, Calendar, User, Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import PRPrintTemplate from '../forms/PRPrintTemplate';
import RISPrintTemplate from '../forms/RISPrintTemplate';
import { generatePurchaseRequestDocx } from '../../utils/docxGenerator';

export default function StatusChecker() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState<any | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    setError('');
    setRecord(null);

    const { data, error: dbError } = await supabase
      .from('gsoid')
      .select('*, items:line_items(*)')
      .eq('id', query.trim())
      .single();

    if (dbError || !data) {
      setError('GSOID not found. Please double-check your ID.');
    } else {
      setRecord(data);
    }
    setLoading(false);
  };

  const handlePrint = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    window.focus();
    window.print();
  };

  const handleDownloadDocx = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!record || record.type !== 'PR') return;
    
    setLoading(true);
    try {
      await generatePurchaseRequestDocx(record, record.items, record.id);
    } catch (err) {
      console.error(err);
      setError('Failed to generate DOCX. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-amber-500 bg-amber-50 border-amber-100';
      case 'APPROVED': return 'text-blue-500 bg-blue-50 border-blue-100';
      case 'COMPLETE': return 'text-emerald-500 bg-emerald-50 border-emerald-100';
      case 'DISCREPANCY': return 'text-red-500 bg-red-50 border-red-100';
      default: return 'text-slate-500 bg-slate-50 border-slate-100';
    }
  };

  return (
    <>
      {record && (
        <div className="hidden print:block">
          {record.type === 'PR' ? (
            <PRPrintTemplate 
              data={record} 
              items={record.items} 
              gsoid={record.id} 
              isOfficial={['APPROVED', 'COMPLETE'].includes(record.status)}
            />
          ) : (
            <RISPrintTemplate 
              data={record} 
              items={record.items} 
              gsoid={record.id} 
            />
          )}
        </div>
      )}

      <div className="p-8 max-w-4xl mx-auto space-y-8 print:hidden">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Request <span className="text-blue-600">Tracking</span></h2>
          <p className="text-slate-500">Enter your GSOID to check the status of your Purchase Request or RIS.</p>
        </div>

        <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="GSOIDMMDDYYXXX"
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase font-mono"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-bold transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Track'}
          </button>
        </form>

        {error && (
          <div className="max-w-xl mx-auto p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center space-x-2">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {record && (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className={`px-4 py-1 rounded-full text-xs font-bold border ${getStatusColor(record.status)}`}>
                  {record.status}
                </div>
                <p className="text-xs font-mono text-slate-400">{record.id}</p>
              </div>
              <div className="flex items-center space-x-2">
                <p className="text-xs font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                   TYPE: {record.type}
                </p>
                {record.type === 'PR' && (
                  <button 
                    type="button"
                    onClick={handleDownloadDocx}
                    className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-sm active:scale-95 text-xs font-bold"
                    title="Download Official DOCX"
                  >
                    <Download size={14} />
                    <span>Download DOCX</span>
                  </button>
                )}
              </div>
            </div>

          <div className="p-8 grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Department</p>
                <div className="flex items-center space-x-2 text-slate-900 font-bold">
                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                    <User size={16} />
                  </div>
                  <span>{record.department}</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Requested By</p>
                <p className="font-medium text-slate-700">{record.requested_by}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Submission Date</p>
                <div className="flex items-center space-x-2 text-slate-600">
                  <Calendar size={16} />
                  <span>{format(new Date(record.date), 'MMMM dd, yyyy')}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6">
              <h4 className="text-xs font-bold text-slate-800 uppercase mb-4">Request Progress</h4>
              <div className="space-y-4">
                {[
                  { label: 'Submitted', active: true, icon: Clock },
                  { label: 'Admin Approval', active: ['APPROVED', 'COMPLETE'].includes(record.status), icon: CheckCircle2 },
                  { label: 'Warehouse Ready', active: record.status === 'COMPLETE', icon: CheckCircle2 },
                ].map((step, idx) => (
                  <div key={`tracker-step-${step.label}-${idx}`} className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step.active ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                      <step.icon size={14} />
                    </div>
                    <span className={`text-sm font-medium ${step.active ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
            <p className="text-xs text-slate-500">
              Present this tracking screen to the GSO office to claim your supplies.
            </p>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  User, 
  Calendar, 
  Loader2,
  ChevronRight,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { generateDRDocx } from '../../utils/drGenerator';

interface DRFormData {
  gsoid: string;
  actual_items_received: number;
  inspection_status: 'COMPLETE' | 'DISCREPANCY';
  warehouse_remarks: string;
  inspected_by: string;
  inspection_date: string;
}

export default function DRRequestForm() {
  const [searchGsoid, setSearchGsoid] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [requestData, setRequestData] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [drNumber, setDrNumber] = useState('');
  const [createdDrId, setCreatedDrId] = useState<string | null>(null);

  const [formData, setFormData] = useState<DRFormData>({
    gsoid: '',
    actual_items_received: 0,
    inspection_status: 'COMPLETE',
    warehouse_remarks: '',
    inspected_by: '',
    inspection_date: new Date().toISOString().split('T')[0]
  });

  const handleSearch = async () => {
    if (!searchGsoid) return;
    setLoading(true);
    setError('');
    setRequestData(null);
    setCreatedDrId(null);

    try {
      const { data, error } = await supabase
        .from('gsoid')
        .select(`
          *,
          line_items (*)
        `)
        .eq('id', searchGsoid.toUpperCase())
        .single();

      if (error) throw error;

      if (data.status !== 'APPROVED' && data.status !== 'COMPLETE') {
        setError(`Request with GSOID ${searchGsoid} is not yet approved. Current status: ${data.status}`);
        return;
      }

      setRequestData(data);
      setItems(data.line_items.map((i: any) => ({ ...i, actual_qty: i.qty })));
      setFormData(prev => ({
        ...prev,
        gsoid: data.id,
        actual_items_received: data.line_items.reduce((acc: number, item: any) => acc + Number(item.qty), 0)
      }));
    } catch (err: any) {
      console.error('Search Error:', err);
      setError('GSOID not found or system error.');
    } finally {
      setLoading(false);
    }
  };

  const updateItemQty = (id: string, qty: number) => {
    setItems(prev => {
      const updated = prev.map(item => item.id === id ? { ...item, actual_qty: qty } : item);
      const totalActual = updated.reduce((acc, item) => acc + Number(item.actual_qty), 0);
      const totalExpected = requestData.line_items.reduce((acc: number, item: any) => acc + Number(item.qty), 0);
      
      setFormData(prevForm => ({
        ...prevForm,
        actual_items_received: totalActual,
        inspection_status: totalActual === totalExpected ? 'COMPLETE' : 'DISCREPANCY'
      }));
      
      return updated;
    });
  };

  const generateDRNumber = () => {
    const date = new Date();
    const yearMonth = format(date, 'yyyyMM');
    const random = Math.floor(100 + Math.random() * 900);
    return `DR-${yearMonth}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const newDrNumber = generateDRNumber();
      setDrNumber(newDrNumber);

      const { data: drData, error: drError } = await supabase
        .from('delivery_receipts')
        .insert({
          ...formData,
          dr_number: newDrNumber
        })
        .select()
        .single();

      if (drError) throw drError;
      setCreatedDrId(drData.id);

      // Update GSOID status to COMPLETE if not already
      if (formData.inspection_status === 'COMPLETE') {
        const { error: updateError } = await supabase
          .from('gsoid')
          .update({ status: 'COMPLETE' })
          .eq('id', formData.gsoid);
        
        if (updateError) throw updateError;

        // Inventory is now handled by a Database Trigger for reliability
        // Trigger: update_inventory_on_dr_complete on delivery_receipts table
      }

      setSuccess(true);
      
      // Auto download
      try {
        await generateDRDocx(drData.id);
      } catch (genErr) {
        console.error('Initial Download Error:', genErr);
      }
    } catch (err: any) {
      console.error('Submission Error:', err);
      setError(err.message || 'Failed to submit Delivery Receipt');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadDR = async () => {
    if (!createdDrId) return;
    setLoading(true);
    try {
      await generateDRDocx(createdDrId);
    } catch (err) {
      console.error('Download Error:', err);
      setError('Failed to generate document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSuccess(false);
    setRequestData(null);
    setSearchGsoid('');
    setCreatedDrId(null);
    setFormData({
      gsoid: '',
      actual_items_received: 0,
      inspection_status: 'COMPLETE',
      warehouse_remarks: '',
      inspected_by: '',
      inspection_date: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Package className="text-blue-600" size={32} />
            Warehouse DR Creation
          </h1>
          <p className="text-slate-500 font-medium mt-1 uppercase text-xs tracking-widest">Delivery Inspection & Receipt Processing</p>
        </div>
      </div>

      {!requestData && !success && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100"
        >
          <div className="space-y-4 max-w-md mx-auto text-center">
            <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Search className="text-blue-600" size={28} />
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">Lookup Approved Request</h2>
            <p className="text-sm text-slate-500">Enter the GSOID from the approved Purchase Request or RIS to start inspection.</p>
            
            <div className="flex gap-2 pt-4">
              <input 
                type="text"
                placeholder="GSOID120324001"
                className="flex-1 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-mono font-bold uppercase tracking-widest text-center"
                value={searchGsoid}
                onChange={(e) => setSearchGsoid(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button 
                onClick={handleSearch}
                disabled={loading}
                className="bg-blue-600 text-white px-6 rounded-2xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : <ChevronRight />}
              </button>
            </div>
            {error && <p className="text-red-500 text-xs font-bold uppercase tracking-tight mt-2">{error}</p>}
          </div>
        </motion.div>
      )}

      {requestData && !success && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Request Summary Card */}
            <div className="md:col-span-2 space-y-6">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100"
              >
                <div className="flex items-center justify-between mb-4">
                   <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <FileText className="text-blue-500" size={18} />
                    Request Summary
                  </h3>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold uppercase">
                    {requestData.type} - {requestData.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-2xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Department</p>
                    <p className="text-sm font-black text-slate-700 uppercase">{requestData.department}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Requested By</p>
                    <p className="text-sm font-black text-slate-700 uppercase">{requestData.requested_by}</p>
                  </div>
                </div>
              </motion.div>

              {/* Item Inspection Table */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden"
              >
                <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest">Inspection & Verification</span>
                  <span className="text-[10px] px-2 py-1 bg-slate-800 rounded-lg">{items.length} Items to inspect</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3 text-center">Expected</th>
                        <th className="px-4 py-3 text-center">Actual Received</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-4 text-sm font-bold text-slate-700 uppercase">{item.item_description}</td>
                          <td className="px-4 py-4 text-center font-black text-slate-400">{item.qty} {item.unit}</td>
                          <td className="px-4 py-4">
                            <input 
                              type="number"
                              className="w-20 p-2 bg-blue-50/50 border-2 border-blue-100 rounded-xl text-center text-sm font-black text-blue-700 focus:border-blue-500 outline-none"
                              value={item.actual_qty}
                              onChange={(e) => updateItemQty(item.id, Number(e.target.value))}
                              min="0"
                            />
                          </td>
                          <td className="px-4 py-4 text-center">
                            {item.actual_qty === Number(item.qty) ? (
                              <CheckCircle2 className="text-emerald-500 mx-auto" size={20} />
                            ) : (
                              <AlertCircle className="text-amber-500 mx-auto" size={20} />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>

            {/* Sidebar Controls */}
            <div className="space-y-6">
              <motion.div 
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 space-y-6"
              >
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b pb-4">Inspection Meta</h3>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                      <User size={12} />
                      Inspected By
                    </label>
                    <input 
                      type="text"
                      className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold uppercase"
                      placeholder="Admin Name"
                      value={formData.inspected_by}
                      onChange={(e) => setFormData({...formData, inspected_by: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                      <Calendar size={12} />
                      Inspection Date
                    </label>
                    <input 
                      type="date"
                      className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm"
                      value={formData.inspection_date}
                      onChange={(e) => setFormData({...formData, inspection_date: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                      Inspection Status
                    </label>
                    <div className={`p-3 rounded-xl border-2 font-black text-xs text-center uppercase ${
                      formData.inspection_status === 'COMPLETE' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'
                    }`}>
                      {formData.inspection_status}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Warehouse Remarks</label>
                    <textarea 
                      className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm h-32 resize-none"
                      placeholder="Add inspection notes here..."
                      value={formData.warehouse_remarks}
                      onChange={(e) => setFormData({...formData, warehouse_remarks: e.target.value})}
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-950 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : 'Finalize Delivery Receipt'}
                </button>
                <button 
                  type="button"
                  onClick={resetForm}
                  className="w-full text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors"
                >
                  Cancel Inspection
                </button>
              </motion.div>
            </div>
          </div>
        </form>
      )}

      {/* Success View */}
      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-12 rounded-[40px] shadow-2xl border border-slate-100 text-center space-y-6 max-w-lg mx-auto"
          >
            <div className="w-24 h-24 bg-emerald-500 rounded-[32px] flex items-center justify-center mx-auto text-white shadow-xl shadow-emerald-500/30">
              <CheckCircle2 size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">DR Finalized!</h2>
              <p className="text-slate-500 font-medium">Delivery Receipt <span className="text-blue-600 font-mono font-bold tracking-widest">{drNumber}</span> has been processed.</p>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-3xl border border-dashed border-slate-200">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Inspection Result</p>
               <div className="flex justify-around">
                 <div>
                   <p className="text-2xl font-black text-slate-900">{formData.actual_items_received}</p>
                   <p className="text-[10px] font-bold text-slate-500 uppercase">Received</p>
                 </div>
                 <div className="w-px h-8 bg-slate-200 mt-2"></div>
                 <div>
                   <p className="text-2xl font-black text-slate-900">{formData.inspection_status}</p>
                   <p className="text-[10px] font-bold text-slate-500 uppercase">Outcome</p>
                 </div>
               </div>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <button 
                onClick={() => handleDownloadDR()}
                className="bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Download Receipt Copy
              </button>
              <button 
                onClick={resetForm}
                className="bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
              >
                Process Another Entry
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && !success && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold uppercase tracking-tight">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
    </div>
  );
}

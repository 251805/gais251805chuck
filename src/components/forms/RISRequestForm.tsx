import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingDown, Plus, Trash2, Save, Printer, CheckCircle, Package } from 'lucide-react';
import { DEPARTMENTS } from '../../constants';
import { generateGSOID } from '../../utils/gsoid';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import RISPrintTemplate from './RISPrintTemplate';

export default function RISRequestForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [gsoid, setGsoid] = useState('');
  const [formData, setFormData] = useState({
    department: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    requested_by: '',
    remarks: ''
  });

  const [items, setItems] = useState([{ id: crypto.randomUUID(), unit: '', item_description: '', qty: 1 }]);

  useEffect(() => {
    async function initGsoid() {
      if (!gsoid) {
        const id = await generateGSOID();
        setGsoid(id);
      }
    }
    initGsoid();
  }, []);

  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const addLineItem = () => setItems([...items, { id: crypto.randomUUID(), unit: '', item_description: '', qty: 1 }]);
  const removeLineItem = (id: string) => items.length > 1 && setItems(items.filter(i => i.id !== id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.department || !formData.requested_by) {
      setError('Please fill all mandatory fields (*)');
      setLoading(false);
      return;
    }

    try {
      const { error: gsoidError } = await supabase.from('gsoid').insert({
        id: gsoid,
        department: formData.department,
        date: formData.date,
        requested_by: formData.requested_by,
        remarks: formData.remarks,
        type: 'RIS',
        status: 'PENDING'
      });

      if (gsoidError) {
        console.error('gsoid Insert Error:', gsoidError);
        throw gsoidError;
      }

      const lineItems = items.filter(i => i.item_description && i.unit).map(item => ({
        gsoid_id: gsoid,
        unit: item.unit,
        item_description: item.item_description,
        qty: Number(item.qty) || 0,
        unit_cost: 0,
        total_cost: 0
      }));

      const { error: itemsError } = await supabase.from('line_items').insert(lineItems);
      if (itemsError) {
        console.error('Line Items Insert Error:', itemsError);
        throw itemsError;
      }

      setSuccess(true);
      setLoading(false);
      setError('');
      // Scroll to success message
      setTimeout(() => {
        const element = document.getElementById('success-message-ris');
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error('Submission Error:', err);
      setError(err.message || 'An error occurred during submission. Please check connection.');
      setLoading(false);
      // Scroll to error message
      setTimeout(() => {
        const element = document.getElementById('error-message-ris');
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setSuccess(false);
    setItems([{ id: crypto.randomUUID(), unit: '', item_description: '', qty: 1 }]);
    setFormData({ ...formData, requested_by: '', remarks: '' });
    const newId = await generateGSOID();
    setGsoid(newId);
  };

  const handlePrint = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    window.focus();
    window.print();
  };

  return (
    <>
      <div className="hidden print:block">
        <RISPrintTemplate 
          data={formData} 
          items={items} 
          gsoid={gsoid} 
        />
      </div>

      <div className="p-8 max-w-5xl mx-auto print:hidden">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-emerald-600 p-6 text-white flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold flex items-center space-x-2">
                <TrendingDown />
                <span>Requisition and Issue Slip (RIS)</span>
              </h2>
              <p className="text-emerald-100 text-sm mt-1">Request supplies from existing stock</p>
            </div>
          </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Department *</label>
              <select 
                className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-100 focus:border-emerald-500 transition-all font-medium"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                required
              >
                <option value="">Select Department</option>
                {DEPARTMENTS.map((d, i) => <option key={`dept-opt-ris-${i}`} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Date *</label>
                <input 
                  type="date"
                  className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-100"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Requested By *</label>
                <input 
                  type="text"
                  placeholder="Full Name"
                  className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-100"
                  value={formData.requested_by}
                  onChange={(e) => setFormData({...formData, requested_by: e.target.value})}
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex items-center space-x-2">
              <Package size={16} className="text-emerald-500" />
              <span>Requested Supplies</span>
            </h3>

            {items.map((item, idx) => (
              <div key={`ris-row-${item.id}`} className="flex gap-4 items-end bg-slate-50 p-4 rounded-2xl relative group">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Description *</label>
                  <input 
                    type="text"
                    placeholder="Item Name / Specifications"
                    className="w-full p-2 bg-white rounded-lg border border-slate-200 text-sm"
                    value={item.item_description}
                    onChange={(e) => updateItem(item.id, 'item_description', e.target.value)}
                    required
                  />
                </div>
                <div className="w-32 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Unit *</label>
                  <input 
                    type="text"
                    placeholder="pc, box, etc"
                    className="w-full p-2 bg-white rounded-lg border border-slate-200 text-sm"
                    value={item.unit}
                    onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                    required
                  />
                </div>
                <div className="w-24 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Qty *</label>
                  <input 
                    type="number"
                    className="w-full p-2 bg-white rounded-lg border border-slate-200 text-sm"
                    value={item.qty}
                    onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
                    required
                  />
                </div>
                {items.length > 1 && (
                  <button 
                    type="button"
                    onClick={() => removeLineItem(item.id)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}

            <button 
              type="button" 
              onClick={addLineItem}
              className="mt-2 flex items-center space-x-2 text-emerald-600 font-bold text-sm hover:text-emerald-700 transition-colors"
            >
              <Plus size={20} />
              <span>Add Another Item</span>
            </button>
          </div>

          {!success && (
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Save size={20} />
                  <span>Submit RIS Request</span>
                </>
              )}
            </button>
          )}
          {success && (
            <div className="w-full bg-emerald-100 text-emerald-700 font-bold py-4 rounded-xl flex items-center justify-center space-x-2 border-2 border-emerald-200">
              <CheckCircle size={20} />
              <span>RIS Submitted Successfully</span>
            </div>
          )}
        </form>

        <AnimatePresence>
          {success && (
            <motion.div 
               id="success-message-ris"
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="mx-8 mb-8 p-10 bg-emerald-50 rounded-2xl border-2 border-emerald-100 flex flex-col items-center text-center space-y-6"
            >
              <div className="p-4 bg-emerald-500 text-white rounded-full shadow-lg">
                <CheckCircle size={48} />
              </div>
              <div className="space-y-2">
                <h4 className="font-black text-emerald-900 text-2xl uppercase tracking-tight">RIS Submission Successful</h4>
                <p className="text-emerald-700 text-lg">Your Tracking GSOID: <span className="font-mono font-black text-slate-900 bg-white px-3 py-1 rounded-lg shadow-sm border border-emerald-200">{gsoid}</span></p>
              </div>

              <div className="flex space-x-4">
                <button 
                  onClick={handleReset}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-12 py-4 rounded-xl font-black transition-all shadow-xl shadow-emerald-100 active:scale-95 uppercase tracking-wider"
                >
                  Submit New RIS Request
                </button>
              </div>
              
              <div className="max-w-md bg-white/50 p-4 rounded-xl border border-emerald-100 text-xs text-emerald-600 leading-relaxed italic">
                Note: This request is now PENDING. Please present your GSOID at the Warehouse for item issuance once approved by the Admin.
              </div>
            </motion.div>
          )}
          {error && (
            <motion.div 
              id="error-message-ris"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 text-red-600 font-bold text-center mx-8 mb-8 rounded-xl border border-red-100"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </>
  );
}

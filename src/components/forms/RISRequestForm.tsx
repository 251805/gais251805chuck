import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingDown, Plus, Trash2, Save, Printer, CheckCircle, Package, Search, Loader2 } from 'lucide-react';
import { DEPARTMENTS } from '../../constants';
import { generateGSOID } from '../../utils/gsoid';
import { generateRISDocx } from '../../utils/docxGenerator';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import RISPrintTemplate from './RISPrintTemplate';

export default function RISRequestForm() {
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [gsoid, setGsoid] = useState('');
  const [searchGsoid, setSearchGsoid] = useState('');
  const [formData, setFormData] = useState({
    department: '',
    section: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    requested_by: '',
    remarks: ''
  });

  const [items, setItems] = useState([{ id: crypto.randomUUID(), unit: '', item_description: '', qty: 1, remarks: '', stock_no: '' }]);

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

  const addLineItem = () => setItems([...items, { id: crypto.randomUUID(), unit: '', item_description: '', qty: 1, remarks: '', stock_no: '' }]);
  const removeLineItem = (id: string) => items.length > 1 && setItems(items.filter(i => i.id !== id));

  const handleSearchDR = async () => {
    if (!searchGsoid) {
      setError('Please enter a GSOID to search');
      return;
    }

    setSearchLoading(true);
    setError('');
    
    try {
      // Find the GSOID record that is a COMPLETE DR
      const { data: drRecord, error: drError } = await supabase
        .from('gsoid')
        .select('*')
        .eq('id', searchGsoid)
        .eq('status', 'COMPLETE')
        .single();

      if (drError || !drRecord) {
        setError('No completed Delivery Receipt (DR) found for this GSOID');
        setSearchLoading(false);
        return;
      }

      // Fetch line items for this DR
      const { data: lineItems, error: itemsError } = await supabase
        .from('line_items')
        .select('*')
        .eq('gsoid_id', searchGsoid);

      if (itemsError) throw itemsError;

      // Populate form
      setFormData({
        department: drRecord.department,
        section: '', // Add section here
        date: format(new Date(), 'yyyy-MM-dd'),
        requested_by: drRecord.requested_by,
        remarks: `Auto-fetched from DR: ${searchGsoid}`
      });

      if (lineItems && lineItems.length > 0) {
        setItems(lineItems.map(item => ({
          id: crypto.randomUUID(),
          unit: item.unit,
          item_description: item.item_description,
          qty: item.qty,
          remarks: '', // Remove section, add remarks
          stock_no: item.stock_no || ''
        })));
      }

      setError('');
    } catch (err: any) {
      console.error('Search Error:', err);
      setError('Failed to fetch DR details. Please check connection.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const validItems = items.filter(i => i.item_description && i.unit && i.qty);

    if (!formData.department || !formData.requested_by || validItems.length === 0) {
      setError('Please fill all mandatory fields (*) and add at least one item');
      setLoading(false);
      return;
    }

    try {
      // Save items to the new ris_requests table
      const risRecords = validItems.map(item => ({
        gsoid,
        department: formData.department,
        date: formData.date,
        requested_by: formData.requested_by,
        item_description: item.item_description,
        unit: item.unit,
        qty: Number(item.qty) || 0,
        section: formData.section,
        stock_no: item.stock_no,
        remarks: item.remarks || formData.remarks,
        status: 'PENDING'
      }));

      const { error: itemsError } = await supabase.from('ris_requests').insert(risRecords);
      if (itemsError) {
        console.error('RIS Insert Error:', itemsError);
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
      
      let errorMessage = err.message || 'An error occurred during submission. Please check connection.';
      if (errorMessage.includes('schema cache')) {
        errorMessage = "DATABASE SETUP REQUIRED: The 'ris_requests' table does not exist in Supabase! Please create it with columns: id (uuid), gsoid (text), department (text), date (text), requested_by (text), item_description (text), unit (text), qty (numeric), section (text), stock_no (text), remarks (text), status (text).";
      }

      setError(errorMessage);
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

  const handleDownloadDocx = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      await generateRISDocx(formData, items, gsoid);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate DOCX. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setSuccess(false);
    setSearchGsoid('');
    setItems([{ id: crypto.randomUUID(), unit: '', item_description: '', qty: 1, remarks: '', stock_no: '' }]);
    setFormData({ ...formData, requested_by: '', remarks: '' });
    const newId = await generateGSOID();
    setGsoid(newId);
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

      <div className="p-8 max-w-6xl mx-auto print:hidden">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-emerald-600 p-6 text-white flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center space-x-2">
                <TrendingDown />
                <span>Requisition and Issue Slip (RIS)</span>
              </h2>
              <p className="text-emerald-100 text-sm mt-1">Request supplies from existing stock</p>
            </div>
            
            {/* Path B: GSOID Search */}
            <div className="relative w-full md:w-auto">
              <div className="flex bg-white/10 p-1 rounded-xl border border-white/20 backdrop-blur-md">
                <input 
                  type="text" 
                  placeholder="Enter GSOID for Bulk/DR..."
                  className="bg-transparent text-white placeholder:text-white/50 px-4 py-2 text-sm outline-none w-full md:w-56 font-mono font-bold"
                  value={searchGsoid}
                  onChange={(e) => setSearchGsoid(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchDR()}
                />
                <button 
                  type="button"
                  onClick={handleSearchDR}
                  disabled={searchLoading}
                  className="bg-white text-emerald-600 p-2 rounded-lg hover:bg-emerald-50 transition-all flex items-center gap-2 font-bold text-xs"
                >
                  {searchLoading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                  <span className="hidden md:inline uppercase">Auto-Fetch</span>
                </button>
              </div>
              <div className="absolute -bottom-5 left-2 text-[10px] text-emerald-200 font-bold uppercase tracking-wider">
                PATH B: Fetch from DR
              </div>
            </div>
          </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-4">
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
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Section</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-100 focus:border-emerald-500 transition-all"
                  placeholder="e.g. Procurement Section"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                />
              </div>
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
              <span>Requested Items</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold">
                    <th className="px-4 py-3">Stock No.</th>
                    <th className="px-4 py-3">Description *</th>
                    <th className="px-4 py-3 w-32">Unit *</th>
                    <th className="px-4 py-3 w-24">Qty *</th>
                    <th className="px-4 py-3 w-40">Remarks</th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={`ris-row-${item.id}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-2 py-3">
                        <input 
                          type="text"
                          placeholder="---"
                          className="w-full p-2 bg-white rounded-lg border border-slate-200 text-sm font-mono"
                          value={item.stock_no}
                          onChange={(e) => updateItem(item.id, 'stock_no', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-3">
                        <input 
                          type="text"
                          placeholder="Item Name"
                          className="w-full p-2 bg-white rounded-lg border border-slate-200 text-sm"
                          value={item.item_description}
                          onChange={(e) => updateItem(item.id, 'item_description', e.target.value)}
                          required
                        />
                      </td>
                      <td className="px-2 py-3">
                        <input 
                          type="text"
                          placeholder="pc, box"
                          className="w-full p-2 bg-white rounded-lg border border-slate-200 text-sm"
                          value={item.unit}
                          onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                          required
                        />
                      </td>
                  <td className="px-2 py-3">
                    <input 
                      type="number"
                      min="1"
                      className="w-full p-2 bg-white rounded-lg border border-slate-200 text-sm font-bold"
                      value={item.qty}
                      onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                      required
                    />
                  </td>
                      <td className="px-2 py-3">
                        <input 
                          type="text"
                          placeholder="Remarks"
                          className="w-full p-2 bg-white rounded-lg border border-slate-200 text-sm"
                          value={item.remarks}
                          onChange={(e) => updateItem(item.id, 'remarks', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-3 text-right">
                        {items.length > 1 && (
                          <button 
                            type="button"
                            onClick={() => removeLineItem(item.id)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
               initial={{ height: 0, opacity: 0 }}
               animate={{ height: 'auto', opacity: 1 }}
               exit={{ height: 0, opacity: 0 }}
               className="bg-emerald-50 p-10 border-t border-emerald-100 flex flex-col items-center space-y-6"
            >
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="bg-emerald-500 text-white p-3 rounded-full shadow-lg mb-2">
                  <CheckCircle size={32} />
                </div>
                <h2 className="text-2xl font-black text-emerald-900 uppercase">RIS Submitted Successfully!</h2>
                <p className="text-emerald-700 max-w-md">Your tracking GSOID is <span className="font-mono font-black text-slate-900 bg-white px-2 py-1 rounded shadow-sm border border-emerald-200">{gsoid}</span>. Please save this for reference.</p>
              </div>

              <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                <button 
                  type="button"
                  onClick={handleDownloadDocx}
                  disabled={loading}
                  className="flex items-center space-x-3 bg-slate-900 hover:bg-black text-white px-10 py-5 rounded-2xl font-black transition-all shadow-xl active:scale-95 justify-center disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Save size={22} />}
                  <span>DOWNLOAD PENDING RIS (DOCX)</span>
                </button>
                <button 
                  type="button"
                  onClick={handleReset}
                  className="bg-white border-2 border-emerald-200 hover:border-emerald-500 text-emerald-700 px-10 py-5 rounded-2xl font-bold transition-all active:scale-95"
                >
                  New RIS Request
                </button>
              </div>
              
              <div className="bg-emerald-100/50 p-4 rounded-xl border border-emerald-200 text-center">
                <p className="text-[10px] text-emerald-600 uppercase font-black tracking-widest leading-relaxed">
                  Note: This request is now PENDING. <br />
                  Present this tracking number to follow up your request.
                </p>
              </div>
            </motion.div>
          )}
          {error && (
            <motion.div 
              id="error-message-ris"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 text-red-600 font-bold mx-8 mb-8 rounded-xl border border-red-100 whitespace-pre-wrap text-left break-words"
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

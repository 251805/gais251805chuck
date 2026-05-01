import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Printer, Save, AlertCircle, CheckCircle, ClipboardList, Package, Download } from 'lucide-react';
import { DEPARTMENTS } from '../../constants';
import { LineItem, GSOIDRecord } from '../../types';
import { generateGSOID } from '../../utils/gsoid';
import { generatePurchaseRequestDocx } from '../../utils/docxGenerator';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

import PRPrintTemplate from './PRPrintTemplate';

export default function PurchaseRequestForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [gsoid, setGsoid] = useState('');
  const [formData, setFormData] = useState({
    pr: '',
    budget: '',
    bac: '',
    department: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    requested_by: '',
    remarks: '',
    section: '',
    stock_no: ''
  });
  
  type FormLineItem = LineItem;
  const [items, setItems] = useState<FormLineItem[]>([
    { id: crypto.randomUUID(), stock_no: '', unit: '', item_description: '', qty: 0, unit_cost: 0, total_cost: 0 }
  ]);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    async function initGsoid() {
      if (!gsoid) {
        const id = await generateGSOID();
        setGsoid(id);
      }
    }
    initGsoid();
  }, []);

  const addLineItem = () => {
    setItems([
      ...items,
      { id: crypto.randomUUID(), stock_no: '', unit: '', item_description: '', qty: 0, unit_cost: 0, total_cost: 0 }
    ]);
  };

  const removeLineItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'qty' || field === 'unit_cost') {
          updated.total_cost = (Number(updated.qty) || 0) * (Number(updated.unit_cost) || 0);
        }
        return updated;
      }
      return item;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const errors: string[] = [];

    if (!formData.department) errors.push('department');
    if (!formData.requested_by) errors.push('requested_by');
    if (!formData.date) errors.push('date');

    const validItems = items.filter(i => i.item_description && i.unit && i.qty && i.unit_cost);
    if (validItems.length === 0) {
      setError('Please add at least one complete line item.');
      setLoading(false);
      return;
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      setError('Please fill all mandatory fields (*)');
      setLoading(false);
      return;
    }

    try {
      // 1. Insert GSOID Record
      const { error: gsoidError } = await supabase.from('gsoid').insert({
        id: gsoid,
        pr: formData.pr,
        budget: formData.budget,
        bac: formData.bac,
        department: formData.department,
        date: formData.date,
        requested_by: formData.requested_by,
        remarks: formData.remarks,
        type: 'PR',
        status: 'PENDING'
      });

      if (gsoidError) {
        console.error('gsoid Insert Error:', gsoidError);
        throw gsoidError;
      }

      // 2. Insert Line Items
      const lineItemsToInsert = items.filter(i => i.item_description && i.unit).map(item => ({
        gsoid_id: gsoid,
        section: formData.section,
        stock_no: item.stock_no,
        unit: item.unit,
        item_description: item.item_description,
        qty: item.qty || 0,
        unit_cost: item.unit_cost || 0,
        total_cost: item.total_cost || 0
      }));

      const { error: itemsError } = await supabase.from('line_items').insert(lineItemsToInsert);
      if (itemsError) {
        console.error('Line Items Insert Error:', itemsError);
        throw itemsError;
      }

      setSuccess(true);
      setLoading(false);
      setError('');
      // Scroll to success message
      setTimeout(() => {
        const element = document.getElementById('success-message');
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error('Submission Error:', err);
      setError(err.message || 'An error occurred during submission. Please check your connection.');
      setLoading(false);
      // Scroll to error message
      setTimeout(() => {
        const element = document.getElementById('error-message');
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setSuccess(false);
    setItems([{ id: crypto.randomUUID(), stock_no: '', unit: '', item_description: '', qty: 0, unit_cost: 0, total_cost: 0 }]);
    setFormData({ ...formData, pr: '', budget: '', bac: '', requested_by: '', remarks: '', section: '' });
    const newId = await generateGSOID();
    setGsoid(newId);
  };

  const grandTotal = items.reduce((sum, item) => sum + (item.total_cost || 0), 0);

  const handlePrint = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    // Direct print for better reliability in some environments
    window.focus();
    window.print();
  };

  const handleDownloadDocx = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      await generatePurchaseRequestDocx(formData, items, gsoid);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate DOCX. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Printable Template (Hidden on Screen) */}
      <div className="hidden print:block">
        <PRPrintTemplate 
          data={formData} 
          items={items} 
          gsoid={gsoid} 
        />
      </div>

      {/* Main View */}
      <div className="p-8 max-w-6xl mx-auto print:hidden">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center space-x-2">
              <ClipboardList className="text-blue-400" />
              <span>Purchase Request</span>
            </h2>
            <p className="text-slate-400 text-sm mt-1 print:hidden">GSOID: {gsoid}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Main Info Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">PR (Optional)</label>
              <input 
                type="text" 
                placeholder="PLEASE LEAVE THIS BLANK"
                className="w-full p-3 bg-slate-100 rounded-xl border-2 border-transparent focus:border-pink-300 focus:bg-white placeholder:text-pink-300 transition-all font-mono"
                value={formData.pr}
                onChange={(e) => setFormData({ ...formData, pr: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Budget (Optional)</label>
              <input 
                type="text" 
                placeholder="PLEASE LEAVE THIS BLANK"
                className="w-full p-3 bg-slate-100 rounded-xl border-2 border-transparent focus:border-pink-300 focus:bg-white placeholder:text-pink-300 transition-all font-mono"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">BAC (Optional)</label>
              <input 
                type="text" 
                placeholder="PLEASE LEAVE THIS BLANK"
                className="w-full p-3 bg-slate-100 rounded-xl border-2 border-transparent focus:border-pink-300 focus:bg-white placeholder:text-pink-300 transition-all font-mono"
                value={formData.bac}
                onChange={(e) => setFormData({ ...formData, bac: e.target.value })}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-4">
              <div className="space-y-1">
                <label className={`text-xs font-bold uppercase ${validationErrors.includes('department') ? 'text-red-500' : 'text-slate-500'}`}>
                  Department *
                </label>
                <select 
                  className={`w-full p-3 bg-slate-50 rounded-xl border-2 ${validationErrors.includes('department') ? 'border-red-300' : 'border-slate-100'} focus:border-blue-500 transition-all`}
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  required
                >
                  <option value="">Select Department</option>
              {DEPARTMENTS.map((dept, idx) => <option key={`dept-opt-pr-${idx}`} value={dept}>{dept}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Section</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-100 focus:border-blue-500 transition-all"
                  placeholder="e.g. Procurement Section"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className={`text-xs font-bold uppercase ${validationErrors.includes('date') ? 'text-red-500' : 'text-slate-500'}`}>Date *</label>
                <input 
                  type="date" 
                  className={`w-full p-3 bg-slate-50 rounded-xl border-2 ${validationErrors.includes('date') ? 'border-red-300' : 'border-slate-100'} focus:border-blue-500 transition-all`}
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className={`text-xs font-bold uppercase ${validationErrors.includes('requested_by') ? 'text-red-500' : 'text-slate-500'}`}>Requested By *</label>
                <input 
                  type="text" 
                  autoComplete="name"
                  className={`w-full p-3 bg-slate-50 rounded-xl border-2 ${validationErrors.includes('requested_by') ? 'border-red-300' : 'border-slate-100'} focus:border-blue-500 transition-all`}
                  placeholder="e.g. Jarold Lee"
                  value={formData.requested_by}
                  onChange={(e) => setFormData({ ...formData, requested_by: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex items-center space-x-2">
              <Package size={16} />
              <span>Line Items</span>
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold">
                    <th className="px-4 py-3">Stock No.</th >
                    <th className="px-4 py-3">Unit *</th>
                    <th className="px-4 py-3">Description *</th>
                    <th className="px-4 py-3">Qty *</th>
                    <th className="px-4 py-3">Unit Cost *</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3 print:hidden"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={`pr-row-${item.id}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-2 py-3 w-24">
                        <input 
                          type="text" 
                          placeholder="Stock No."
                          className="w-full p-2 bg-white rounded-lg border border-slate-200 text-sm"
                          value={item.stock_no || ''}
                          onChange={(e) => updateItem(item.id!, 'stock_no', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-3">
                        <input 
                          type="text" 
                          placeholder="e.g. pc, box"
                          className="w-full p-2 bg-white rounded-lg border border-slate-200 text-sm"
                          value={item.unit}
                          onChange={(e) => updateItem(item.id!, 'unit', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-3 w-1/3">
                        <textarea 
                          placeholder="Describe the item..."
                          rows={1}
                          className="w-full p-2 bg-white rounded-lg border border-slate-200 text-sm resize-none"
                          value={item.item_description}
                          onChange={(e) => updateItem(item.id!, 'item_description', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-3 w-20">
                        <input 
                          type="number" 
                          className="w-full p-2 bg-white rounded-lg border border-slate-200 text-sm"
                          value={item.qty}
                          onChange={(e) => updateItem(item.id!, 'qty', parseFloat(e.target.value))}
                        />
                      </td>
                      <td className="px-2 py-3 w-32">
                        <input 
                          type="number" 
                          className="w-full p-2 bg-white rounded-lg border border-slate-200 text-sm"
                          value={item.unit_cost}
                          onChange={(e) => updateItem(item.id!, 'unit_cost', parseFloat(e.target.value))}
                        />
                      </td>
                      <td className="px-2 py-3 font-mono text-sm font-bold text-slate-700">
                        ₱{item.total_cost?.toLocaleString() || '0.00'}
                      </td>
                      <td className="px-2 py-3 text-right print:hidden">
                        <button 
                          type="button"
                          onClick={() => removeLineItem(item.id!)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-4 print:hidden">
              <button 
                type="button" 
                onClick={addLineItem}
                className="flex items-center space-x-2 text-blue-600 font-bold text-sm hover:text-blue-700 transition-colors"
              >
                <Plus size={20} />
                <span>Add Another Line Item</span>
              </button>

              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Grand Total</p>
                <p className="text-2xl font-black text-slate-900 tracking-tight">₱{grandTotal.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 print:hidden">
             <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Remarks</label>
              <textarea 
                className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-100 focus:border-blue-500 transition-all text-sm h-32"
                placeholder="Additional details..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              />
            </div>
            <div className="flex flex-col justify-between">
              <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="text-blue-500 mt-1" size={20} />
                  <div>
                    <h4 className="font-bold text-blue-900 text-sm">GSOID Registration</h4>
                    <p className="text-blue-700/70 text-xs mt-1">Once submitted, this request will be marked as "Pending Approval". You can present your GSOID to follow up on the progress.</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex space-x-4">
                {!success && (
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50`}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save size={20} />
                        <span>Submit Request</span>
                      </>
                    )}
                  </button>
                )}
                {success && (
                  <div className="flex-1 bg-emerald-100 text-emerald-700 font-bold py-4 rounded-xl flex items-center justify-center space-x-2 border-2 border-emerald-200">
                    <CheckCircle size={20} />
                    <span>Submitted Successfully</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>

        <AnimatePresence>
          {error && (
            <motion.div 
              id="error-message"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-red-50 text-red-600 p-4 font-bold text-center border-t border-red-100 whitespace-pre-wrap break-words"
            >
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div 
              id="success-message"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-emerald-50 text-emerald-600 p-8 border-t border-emerald-100 flex flex-col items-center space-y-4"
            >
              <div className="flex items-center space-x-2">
                <CheckCircle size={24} />
                <span className="text-lg font-bold">Purchase Request Submitted Successfully!</span>
              </div>
              <p className="text-emerald-700 text-sm">Your GSOID is <span className="font-mono font-black text-slate-900 bg-white px-2 py-1 rounded shadow-sm">{gsoid}</span></p>
              
              <div className="flex space-x-4 mt-4">
                <button 
                  onClick={handleDownloadDocx}
                  className="flex items-center space-x-3 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-black transition-all shadow-xl shadow-emerald-100 active:scale-95 flex-1 justify-center"
                >
                  <Download size={22} />
                  <span>DOWNLOAD PR (DOCX)</span>
                </button>
                <button 
                  onClick={handleReset}
                  className="bg-white border-2 border-emerald-200 hover:border-emerald-500 text-emerald-700 px-8 py-4 rounded-2xl font-bold transition-all active:scale-95"
                >
                  New Request
                </button>
              </div>
              <p className="text-[10px] text-emerald-500 uppercase font-black tracking-widest mt-4">Note: Presentation of printed GSOID is required for follow-up.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </>
  );
}

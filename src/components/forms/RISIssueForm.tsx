import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Loader2, Package, CheckCircle, AlertCircle, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export default function RISIssueForm() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query) return;

    setLoading(true);
    setError('');
    setSuccess('');
    setItems([]);

    const searchGsoid = query.trim().toUpperCase();
    console.log(`DEBUG: Searching for GSOID: "${searchGsoid}"`);

    try {
      // 1. Verify GSOID exists and check its type and status
      const { data: gsoidData, error: gsoidError } = await supabase
        .from('gsoid')
        .select('type, status, department, requested_by')
        .eq('id', searchGsoid)
        .single();

      if (gsoidError) {
        if (gsoidError.code === 'PGRST116') {
          throw new Error(`GSOID not found: ${searchGsoid}. Please check the ID and try again.`);
        }
        throw gsoidError;
      }

      // 2. Validate Type (Must be RIS)
      if (gsoidData.type !== 'RIS') {
        throw new Error(`Invalid request type. ${searchGsoid} is a ${gsoidData.type}, not an RIS. Only RIS forms can be issued here.`);
      }

      // 3. Validate Status (Should not be purely PENDING, must be approved in workflow)
      // If your workflow strictly requires 'APPROVED', you can block 'PENDING'
      if (gsoidData.status === 'PENDING') {
        throw new Error(`RIS ${searchGsoid} is still PENDING. It must be approved before items can be issued.`);
      }

      // 4. Search in ris_requests table
      const { data: risData, error: risError } = await supabase
        .from('ris_requests')
        .select('*')
        .eq('gsoid', searchGsoid);

      if (risError) throw risError;

      if (risData && risData.length > 0) {
        setItems(risData);
        return;
      }

      // 5. Fallback to line_items if ris_requests is empty (handling legacy data or creation failures)
      console.log('DEBUG: No ris_requests found, falling back to line_items');
      const { data: lineItemsData, error: lineItemsError } = await supabase
        .from('line_items')
        .select('*')
        .eq('gsoid_id', searchGsoid);

      if (lineItemsError) throw lineItemsError;

      if (!lineItemsData || lineItemsData.length === 0) {
        throw new Error(`No items found for RIS: ${searchGsoid}. The form may be empty.`);
      }

      // 6. Convert legacy line_items to match ris_requests expected format
      const convertedItems = lineItemsData.map(item => ({
        id: item.id, // Maps line_item ID
        gsoid: item.gsoid_id,
        department: gsoidData.department,
        date: new Date().toISOString(), // Fallback dynamic date
        requested_by: gsoidData.requested_by,
        item_description: item.item_description,
        unit: item.unit,
        qty: item.qty,
        section: item.section,
        stock_no: item.stock_no,
        remarks: '',
        status: 'PENDING',
        approved_by: null,
        actual_received: null,
        is_issued: false,
        _isLegacy: true // Flag to identify legacy items if needed during issuance
      }));

      setItems(convertedItems);

    } catch (err: any) {
      console.error('Search Error:', err);
      // Use specific error message if available, otherwise generic
      setError(err.message || 'An unexpected error occurred while fetching items.');
    } finally {
      setLoading(false);
    }
  };

  const handleIssueItem = async (itemId: string, qty: number, description: string) => {
    setLoading(true);
    try {
      const targetItem = items.find(i => i.id === itemId);
      
      if (targetItem?._isLegacy) {
        // If it's a legacy item from line_items, it doesn't exist in ris_requests yet
        // So we INSERT it into ris_requests to record the issuance
        const { error: insertError } = await supabase
          .from('ris_requests')
          .insert({
            gsoid: targetItem.gsoid,
            department: targetItem.department,
            date: targetItem.date,
            requested_by: targetItem.requested_by,
            item_description: targetItem.item_description,
            unit: targetItem.unit,
            qty: targetItem.qty,
            section: targetItem.section,
            stock_no: targetItem.stock_no,
            remarks: targetItem.remarks,
            status: 'ISSUED',
            actual_received: qty,
            is_issued: true
          });

        if (insertError) throw insertError;
      } else {
        // Normal update for ris_requests
        const { error: updateError } = await supabase
          .from('ris_requests')
          .update({ 
            is_issued: true,
            status: 'ISSUED',
            actual_received: qty,
            updated_at: new Date().toISOString()
          })
          .eq('id', itemId);

        if (updateError) throw updateError;
      }

      // Update local state
      setItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, is_issued: true, status: 'ISSUED', actual_received: qty } 
          : item
      ));

      setSuccess(`Successfully issued ${description}`);
      setTimeout(() => setSuccess(''), 3000);

      // Check if all items are issued, if so update GSOID status
      const allIssued = items.every(i => i.id === itemId ? true : i.is_issued);
      if (allIssued) {
         await supabase
          .from('gsoid')
          .update({ status: 'COMPLETE' })
          .eq('id', query.trim().toUpperCase());
      }

    } catch (err: any) {
      console.error('Issue Error:', err);
      setError('Failed to issue item. Check stock levels or database connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-500 rounded-lg text-white">
            <ShoppingCart size={20} />
          </div>
          <span>RIS Issuance Control</span>
        </h3>
        
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Enter GSOID to issue items..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-mono font-bold uppercase"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Fetch items'}
          </button>
        </form>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-2 text-sm font-bold"
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </motion.div>
        )}
        
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 flex items-center gap-2 text-sm font-bold"
          >
            <CheckCircle size={18} />
            <span>{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {items.length > 0 && (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Requested Items for {query.toUpperCase()}</span>
            <div className="flex gap-2">
               <div className="bg-white px-3 py-1 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500">
                DEPT: {items[0]?.department}
               </div>
               <div className="bg-white px-3 py-1 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500">
                USER: {items[0]?.requested_by}
               </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Item Description</th>
                  <th className="px-6 py-4">Qty Requested</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-amber-50/20 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{item.item_description}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase">{item.unit}</p>
                    </td>
                    <td className="px-6 py-4 font-black text-slate-700 text-lg">
                      {item.qty}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${
                        item.is_issued ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.is_issued ? 'ISSUED' : 'PENDING'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!item.is_issued ? (
                        <button 
                          onClick={() => handleIssueItem(item.id, item.qty, item.item_description)}
                          disabled={loading}
                          className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ml-auto"
                        >
                          <Package size={14} />
                          <span>ISSUE ITEM</span>
                        </button>
                      ) : (
                        <div className="flex items-center justify-end text-emerald-600 gap-1.5 font-bold text-xs">
                          <CheckCircle size={14} />
                          <span>RELEASED</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

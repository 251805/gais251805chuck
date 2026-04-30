import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { InventoryItem } from '../../types';
import { Search, Package, AlertTriangle, RefreshCcw } from 'lucide-react';

export default function InventoryView() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory_master')
      .select('*')
      .order('item_description');
    
    if (!error && data) setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchInventory();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('inventory-changes')
      .on('postgres_changes' as any, { event: '*', table: 'inventory_master' }, () => {
        fetchInventory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = items.filter(i => 
    i.item_description.toLowerCase().includes(search.toLowerCase()) ||
    i.stock_no?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Package className="text-blue-600" />
            <span>Inventory Peak</span>
          </h2>
          <p className="text-slate-500 text-sm">Real-time stock availability overview</p>
        </div>
        
        <div className="flex items-center space-x-2">
           <button 
            onClick={fetchInventory}
            className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-slate-400 hover:text-blue-600 transition-all shadow-sm"
          >
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search items..."
              className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl w-full md:w-64 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={`inventory-skeleton-${i}`} className="h-40 bg-slate-100 rounded-3xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
          <div className="p-4 bg-slate-50 w-fit mx-auto rounded-full mb-4 text-slate-300">
            <Package size={48} />
          </div>
          <p className="text-slate-500 font-medium">No items found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item, idx) => (
            <div key={`inv-card-${item.id || 'fallback-' + idx}`} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group">
              {item.quantity_on_hand <= 10 && (
                <div className="absolute top-4 right-4 text-amber-500" title="Low Stock">
                  <AlertTriangle size={18} />
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.unit}</p>
                  <h3 className="font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">{item.item_description}</h3>
                  {item.stock_no && <p className="text-[10px] font-mono text-slate-400 mt-1">SN: {item.stock_no}</p>}
                </div>
                
                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Available</p>
                    <p className={`text-2xl font-black ${item.quantity_on_hand > 0 ? 'text-slate-900' : 'text-red-500'}`}>
                      {item.quantity_on_hand}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Last Updated</p>
                    <p className="text-[10px] text-slate-500">{new Date(item.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

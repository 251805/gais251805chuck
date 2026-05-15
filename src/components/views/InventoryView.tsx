import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { InventoryItem } from '../../types';
import { 
  Search, 
  Package, 
  AlertTriangle, 
  RefreshCcw, 
  ChevronUp, 
  ChevronDown,
  ArrowUpDown,
  ExternalLink,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

type SortKey = keyof InventoryItem | 'total_value';
type SortOrder = 'asc' | 'desc';

export default function InventoryView() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; order: SortOrder }>({
    key: 'item_description',
    order: 'asc'
  });

  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory_master')
      .select('*')
      .order('item_description');
    
    if (!error && data) {
      setItems(data);
    }
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

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      order: current.key === key && current.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getStockStatus = (qty: number) => {
    if (qty <= 0) return { label: 'Out of Stock', color: 'text-red-600 bg-red-50 border-red-100', dot: 'bg-red-500' };
    if (qty <= 10) return { label: 'Low Stock', color: 'text-amber-600 bg-amber-50 border-amber-100', dot: 'bg-amber-500' };
    return { label: 'Healthy', color: 'text-emerald-600 bg-emerald-50 border-emerald-100', dot: 'bg-emerald-500' };
  };

  const filteredAndSorted = items
    .filter(i => {
      const searchStr = search.toLowerCase();
      return (
        i.item_description.toLowerCase().includes(searchStr) ||
        i.stock_no?.toLowerCase().includes(searchStr) ||
        i.unit.toLowerCase().includes(searchStr)
      );
    })
    .sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof InventoryItem];
      let bValue: any = b[sortConfig.key as keyof InventoryItem];

      if (sortConfig.key === 'total_value') {
        aValue = (a.quantity_on_hand || 0) * (a.unit_cost || 0);
        bValue = (b.quantity_on_hand || 0) * (b.unit_cost || 0);
      }

      if (aValue < bValue) return sortConfig.order === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.order === 'asc' ? 1 : -1;
      return 0;
    });

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortConfig.key !== column) return <ArrowUpDown size={14} className="ml-1 opacity-20 group-hover:opacity-100" />;
    return sortConfig.order === 'asc' ? <ChevronUp size={14} className="ml-1 text-blue-600" /> : <ChevronDown size={14} className="ml-1 text-blue-600" />;
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
              <Package className="text-white" size={24} />
            </div>
            <span>Inventory Peak</span>
          </h2>
          <p className="text-slate-500 text-sm mt-1">GSO Warehouse Master Control & Stock Tracking</p>
        </div>
        
        <div className="flex items-center space-x-3">
           <button 
            onClick={fetchInventory}
            disabled={loading}
            className="p-3 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 hover:text-blue-600 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="Refresh Inventory"
          >
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="relative group flex-1 md:flex-none">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Search by description, SN, or unit..."
              className="pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl w-full md:w-80 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Items', value: items.length, icon: Package, color: 'text-blue-600' },
          { label: 'Low Stock', value: items.filter(i => i.quantity_on_hand > 0 && i.quantity_on_hand <= 10).length, icon: AlertTriangle, color: 'text-amber-600' },
          { label: 'Out of Stock', value: items.filter(i => i.quantity_on_hand <= 0).length, icon: AlertTriangle, color: 'text-red-600' },
          { label: 'Total Value', value: `₱${items.reduce((acc, curr) => acc + (curr.quantity_on_hand * curr.unit_cost), 0).toLocaleString()}`, icon: History, color: 'text-slate-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-3">
            <div className={`p-2 rounded-xl bg-slate-50 ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <p className="text-lg font-black text-slate-900 leading-none">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar max-h-[calc(100vh-320px)] md:max-h-[calc(100vh-380px)] overflow-y-auto">
          <table className="w-full text-left border-separate border-spacing-0 min-w-[1000px] md:min-w-full">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-50/95 backdrop-blur-sm border-b border-slate-100">
                {[
                  { key: 'item_description', label: 'Item Description', sortable: true, width: 'min-w-[280px]' },
                  { key: 'stock_no', label: 'Stock No', sortable: true, width: 'w-24' },
                  { key: 'unit', label: 'Unit', sortable: true, width: 'w-20' },
                  { key: 'quantity_on_hand', label: 'Qty', sortable: true, width: 'w-24' },
                  { key: 'unit_cost', label: 'Cost', sortable: true, width: 'w-28' },
                  { key: 'total_value', label: 'Total Value', sortable: true, width: 'w-32' },
                  { key: 'updated_at', label: 'Updated', sortable: true, width: 'w-32' },
                  { key: 'status', label: 'Status', sortable: false, width: 'w-32' },
                ].map((col) => (
                  <th 
                    key={col.key}
                    onClick={() => col.sortable && handleSort(col.key as SortKey)}
                    className={`p-4 md:p-5 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 first:rounded-tl-[2rem] last:rounded-tr-[2rem] bg-slate-50/95 ${col.width} ${col.sortable ? 'cursor-pointer hover:text-blue-600 group transition-colors' : ''}`}
                  >
                    <div className="flex items-center">
                      {col.label}
                      {col.sortable && <SortIcon column={col.key as SortKey} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="animate-pulse border-b border-slate-50">
                      {Array(8).fill(0).map((__, j) => (
                        <td key={j} className="p-5">
                          <div className="h-4 bg-slate-100 rounded-lg w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredAndSorted.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-20 text-center">
                      <div className="flex flex-col items-center">
                        <div className="p-4 bg-slate-50 rounded-full mb-4">
                          <Package size={48} className="text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-medium tracking-tight">No inventory items found</p>
                        <p className="text-sm text-slate-400 mt-1">Try adjusting your search filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAndSorted.map((item, idx) => {
                    const status = getStockStatus(item.quantity_on_hand);
                    const totalValue = item.quantity_on_hand * item.unit_cost;
                    
                    return (
                      <motion.tr 
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="group hover:bg-blue-50/30 border-b border-slate-50 transition-all cursor-default"
                      >
                        <td className="p-5">
                          <div className="max-w-[300px]">
                            <p className="font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                              {item.item_description}
                            </p>
                          </div>
                        </td>
                        <td className="p-5 font-mono text-[11px] text-slate-500">
                          {item.stock_no || '--'}
                        </td>
                        <td className="p-5">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase">
                            {item.unit}
                          </span>
                        </td>
                        <td className="p-5">
                          <span className={`text-lg font-black tracking-tight ${item.quantity_on_hand <= 0 ? 'text-red-500' : item.quantity_on_hand <= 10 ? 'text-amber-500' : 'text-slate-900'}`}>
                            {item.quantity_on_hand}
                          </span>
                        </td>
                        <td className="p-5 font-medium text-slate-600">
                          ₱{item.unit_cost?.toLocaleString() || '0'}
                        </td>
                        <td className="p-5 font-bold text-slate-900 capitalize">
                          ₱{totalValue.toLocaleString()}
                        </td>
                        <td className="p-5">
                          <div className="flex flex-col">
                            <span className="text-slate-600 font-medium text-xs">{format(new Date(item.updated_at), 'MM/dd/yyyy')}</span>
                            <span className="text-[10px] text-slate-400">{format(new Date(item.updated_at), 'hh:mm a')}</span>
                          </div>
                        </td>
                        <td className="p-5">
                          <div className={`px-3 py-1.5 rounded-full border flex items-center space-x-2 w-fit ${status.color}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${status.dot} animate-pulse`} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">{status.label}</span>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

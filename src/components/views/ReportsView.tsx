import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Calendar, 
  Filter, 
  ChevronDown, 
  ArrowUpRight, 
  ArrowDownLeft,
  Package,
  TrendingUp,
  History,
  LayoutDashboard
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { LINKS } from '../../constants';
import { 
  format, 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear,
  subDays,
  parseISO
} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

type Timeframe = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

interface TransactionReport {
  id: string;
  date: string;
  type: 'PR' | 'RIS' | 'DR';
  gsoid: string;
  department: string;
  description: string;
  quantity: number;
  unit: string;
  status: string;
  // Financial (Admin)
  pr_no?: string;
  budget_code?: string;
  unit_cost?: number;
  total_cost?: number;
  // Operational (Warehouse)
  stock_no?: string;
  actual_received?: number;
  actual_issued?: number;
  dr_number?: string;
}

export default function ReportsView() {
  const { role } = useAuth();
  const [timeframe, setTimeframe] = useState<Timeframe>('daily');
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [reportType, setReportType] = useState<'all' | 'procurement' | 'warehouse'>('all');
  const [data, setData] = useState<TransactionReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, [timeframe, startDate, endDate, reportType]);

  const getDateRange = () => {
    const now = new Date();
    switch (timeframe) {
      case 'daily':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'weekly':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'monthly':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'yearly':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'custom':
        return { start: startOfDay(parseISO(startDate)), end: endOfDay(parseISO(endDate)) };
      default:
        return { start: startOfDay(now), end: endOfDay(now) };
    }
  };

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const { start, end } = getDateRange();
      const startStr = start.toISOString();
      const endStr = end.toISOString();

      let combinedData: TransactionReport[] = [];

      // 1. Fetch Procurement Data (GSOID + Line Items) - for 'all' or 'procurement'
      if (reportType === 'all' || reportType === 'procurement') {
        const { data: gsoData, error: gsoError } = await supabase
          .from('gsoid')
          .select(`
            id, pr, budget, department, date, status, type,
            line_items (item_description, qty, unit, unit_cost, total_cost, stock_no)
          `)
          .gte('created_at', startStr)
          .lte('created_at', endStr)
          .order('created_at', { ascending: false });

        if (!gsoError && gsoData) {
          gsoData.forEach(record => {
            if (record.line_items && record.line_items.length > 0) {
              record.line_items.forEach((item: any) => {
                combinedData.push({
                  id: `${record.id}-${item.item_description}`,
                  date: record.date,
                  type: record.type as 'PR' | 'RIS',
                  gsoid: record.id,
                  department: record.department,
                  description: item.item_description,
                  quantity: item.qty,
                  unit: item.unit,
                  status: record.status || 'PENDING',
                  pr_no: record.pr,
                  budget_code: record.budget,
                  unit_cost: item.unit_cost,
                  total_cost: item.total_cost,
                  stock_no: item.stock_no
                });
              });
            }
          });
        }
      }

      // 2. Fetch Warehouse Data (Delivery Receipts) - for 'all' or 'warehouse'
      if (reportType === 'all' || reportType === 'warehouse') {
        const { data: drData, error: drError } = await supabase
          .from('delivery_receipts')
          .select(`
            id, gsoid, actual_items_received, inspection_status, inspection_date, dr_number,
            gsoid_ref:gsoid (department)
          `)
          .gte('created_at', startStr)
          .lte('created_at', endStr)
          .order('created_at', { ascending: false });

        if (!drError && drData) {
          drData.forEach(dr => {
            combinedData.push({
              id: dr.id,
              date: dr.inspection_date,
              type: 'DR',
              gsoid: dr.gsoid,
              department: (dr as any).gsoid_ref?.department || 'N/A',
              description: `Receipt: ${dr.dr_number}`,
              quantity: dr.actual_items_received,
              unit: 'Items',
              status: dr.inspection_status,
              dr_number: dr.dr_number,
              actual_received: dr.actual_items_received
            });
          });
        }

        // 3. Fetch RIS Issuances
        const { data: risData, error: risError } = await supabase
          .from('ris_requests')
          .select('*')
          .filter('is_issued', 'eq', true)
          .gte('updated_at', startStr)
          .lte('updated_at', endStr)
          .order('updated_at', { ascending: false });

        if (!risError && risData) {
          risData.forEach(ris => {
            combinedData.push({
              id: ris.id,
              date: format(parseISO(ris.updated_at), 'yyyy-MM-dd'),
              type: 'RIS',
              gsoid: ris.gsoid,
              department: ris.department,
              description: ris.item_description,
              quantity: ris.qty,
              unit: ris.unit,
              status: 'ISSUED',
              actual_issued: ris.actual_received || ris.qty,
              stock_no: ris.stock_no
            });
          });
        }
      }

      // Sort combined data by date
      combinedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setData(combinedData);
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const printableRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printableRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print reports.');
      return;
    }

    const content = printableRef.current.innerHTML;
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(style => style.outerHTML)
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Transaction Report - ${format(new Date(), 'yyyy-MM-dd')}</title>
          ${styles}
          <style>
            @media print {
              @page { size: landscape; margin: 1.5cm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            body { padding: 2rem; background: white; font-family: sans-serif; }
            .print\\:hidden { display: none !important; }
            .hidden.print\\:block { display: block !important; }
            .hidden.print\\:grid { display: grid !important; }
          </style>
        </head>
        <body>
          <div class="max-w-7xl mx-auto">
            ${content}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const totalProcurementValue = data
    .filter(d => d.type === 'PR' || d.type === 'RIS')
    .reduce((sum, d) => sum + (d.total_cost || 0), 0);
  
  const totalItemsMovement = data.reduce((sum, d) => sum + d.quantity, 0);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <FileText className="text-blue-600" size={32} />
            TRANSACTION LOGS
          </h1>
          <p className="text-slate-500 mt-1">Official report generator for procurement and issuance movement.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Filter size={18} />
            <span className="font-semibold text-sm">Filters</span>
            <ChevronDown size={16} className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
          </button>
          
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95"
          >
            <Printer size={18} />
            <span className="font-semibold text-sm">Print Report</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden print:hidden"
          >
            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xl space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Timeframe</label>
                  <div className="flex flex-wrap gap-2">
                    {(['daily', 'weekly', 'monthly', 'yearly', 'custom'] as Timeframe[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTimeframe(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          timeframe === t 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Report Content</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setReportType('all')}
                      className={`px-4 py-2 rounded-xl text-sm font-bold flex-1 transition-all ${
                        reportType === 'all' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      All Transactions
                    </button>
                    <button
                      onClick={() => setReportType('procurement')}
                      className={`px-4 py-2 rounded-xl text-sm font-bold flex-1 transition-all ${
                        reportType === 'procurement' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Procurement
                    </button>
                    <button
                      onClick={() => setReportType('warehouse')}
                      className={`px-4 py-2 rounded-xl text-sm font-bold flex-1 transition-all ${
                        reportType === 'warehouse' ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Warehouse
                    </button>
                  </div>
                </div>

                {timeframe === 'custom' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 bg-blue-100 text-blue-600 rounded-lg"><LayoutDashboard size={20} /></span>
            {/* <span className="text-xs font-bold text-emerald-600 flex items-center">+12% <TrendingUp size={12} /></span> */}
          </div>
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Transactions</h3>
          <p className="text-2xl font-black text-slate-900 mt-1">{data.length}</p>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><TrendingUp size={20} /></span>
          </div>
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Financial Volume</h3>
          <p className="text-2xl font-black text-slate-900 mt-1">₱ {totalProcurementValue.toLocaleString()}</p>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Package size={20} /></span>
          </div>
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Items Movement</h3>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalItemsMovement} Units</p>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 bg-slate-100 text-slate-600 rounded-lg"><History size={20} /></span>
          </div>
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Selected Window</h3>
          <p className="text-lg font-black text-slate-900 mt-1 capitalize">{timeframe}</p>
          <p className="text-[10px] text-slate-400 font-mono mt-1">
            {format(getDateRange().start, 'MMM dd')} - {format(getDateRange().end, 'MMM dd, yyyy')}
          </p>
        </div>
      </div>

      {/* Main Report Table */}
      <div ref={printableRef} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden print:border-none print:shadow-none">
        {/* Printable Header */}
        <div className="hidden print:block p-8 border-b-2 border-slate-900 mb-6 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img src={LINKS.GSO_LOGO} alt="Logo" className="w-16 h-16 rounded-full" />
            <div className="text-left">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">MUNICIPALITY OF PAGBILAO</h1>
              <p className="text-sm font-bold text-slate-600 tracking-widest uppercase">General Services Office (GSO)</p>
            </div>
          </div>
          <div className="bg-slate-900 text-white py-2 px-4 inline-block rounded-lg mb-4">
            <h2 className="text-lg font-black tracking-widest uppercase">Monthly Transaction Summary</h2>
          </div>
          <div className="flex justify-between text-xs font-mono text-slate-500 mt-4">
            <p>Period: {format(getDateRange().start, 'PP')} to {format(getDateRange().end, 'PP')}</p>
            <p>Generated by: {role} | {format(new Date(), 'PPpp')}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 print:bg-slate-100 print:border-b-2 print:border-slate-900">
                <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Date</th>
                <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Type</th>
                <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">GSOID / DR No.</th>
                <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Department</th>
                <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Description</th>
                <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none text-right">Qty</th>
                {(role === 'ADMIN' || role === 'ROOT') && (
                  <>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none text-right">Unit Cost</th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none text-right">Total</th>
                  </>
                )}
                <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-400 font-bold text-sm tracking-widest">Compiling System Data...</p>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-20 text-center">
                    <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">No transactions recorded in this period.</p>
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group print:hover:bg-transparent">
                    <td className="px-4 py-4 text-xs font-medium text-slate-900 whitespace-nowrap">
                      {format(new Date(item.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-tighter ${
                        item.type === 'PR' ? 'bg-emerald-100 text-emerald-700' :
                        item.type === 'RIS' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-mono font-bold text-slate-800">{item.gsoid}</span>
                        {item.dr_number && <span className="text-[10px] font-bold text-amber-600">{item.dr_number}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-600 truncate max-w-[150px]">{item.department}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 line-clamp-1">{item.description}</span>
                        {item.stock_no && <span className="text-[10px] text-slate-400 font-mono">STOCK: {item.stock_no}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs font-black text-slate-900 text-right whitespace-nowrap">
                      {item.quantity} {item.unit}
                    </td>
                    {(role === 'ADMIN' || role === 'ROOT') && (
                      <>
                        <td className="px-4 py-4 text-xs text-slate-600 text-right whitespace-nowrap">
                          {item.unit_cost ? `₱${item.unit_cost.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-4 py-4 text-xs font-bold text-slate-900 text-right whitespace-nowrap">
                          {item.total_cost ? `₱${item.total_cost.toLocaleString()}` : '-'}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-4">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${
                        item.status === 'COMPLETE' || item.status === 'APPROVED' || item.status === 'ISSUED'
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Print Signatures */}
        <div className="hidden print:grid grid-cols-2 gap-20 p-8 mt-20 border-t-2 border-slate-100">
          <div className="text-center pt-8">
            <div className="border-b-2 border-slate-900 pb-2 mb-2 font-bold uppercase tracking-widest">
              {(role || 'System Operator').toUpperCase()}
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Prepared By / Logged Role</p>
          </div>
          <div className="text-center pt-8">
            <div className="border-b-2 border-slate-900 pb-2 mb-2 font-bold uppercase tracking-widest">
              RIZALDO A. RICAFORT
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">GSO Department Head</p>
          </div>
        </div>
      </div>

      <style>{`
  @media print {
    /* 1. Reset base html containers to handle scaling over page breaks */
    html, body, #root, .min-h-screen, main {
      height: auto !important;
      min-height: auto !important;
      overflow: visible !important;
      background: white !important;
      color: black !important;
    }

    /* 2. Strip scroll bars from the scroll workspace container */
    main {
      overflow-y: visible !important;
      display: block !important;
      flex-grow: 1 !important;
    }

    /* 3. Hide background layouts entirely */
    aside, 
    nav, 
    .lg\\:hidden,
    .print\\:hidden, 
    button,
    [class*="Sidebar"], 
    [class*="fixed"] {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
    }

    /* 4. Blow out report view margins so it consumes the sheet canvas */
    .max-w-7xl {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    /* 5. Force background fills on custom table styling headers */
    thead tr {
      background-color: #f1f5f9 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* 6. Document Sheet Boundaries */
    @page {
      margin: 1.5cm;
      size: landscape;
    }
  }
`}</style>
    </div>
  );
}

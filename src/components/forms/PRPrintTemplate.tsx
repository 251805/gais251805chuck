import React from 'react';
import { format } from 'date-fns';
import { LineItem } from '../../types';
import { LINKS } from '../../constants';

interface PRPrintTemplateProps {
  data: {
    pr?: string;
    budget?: string;
    bac?: string;
    department: string;
    date: string;
    requested_by: string;
    remarks?: string;
    section?: string;
    stock_no?: string;
  };
  items: Partial<LineItem>[];
  gsoid: string;
  isOfficial?: boolean;
}

export default function PRPrintTemplate({ data, items = [], gsoid, isOfficial = false }: PRPrintTemplateProps) {
  const safeItems = Array.isArray(items) ? items : [];
  const grandTotal = safeItems.reduce((sum, item) => sum + (item?.total_cost || 0), 0);
  
  // Fill empty rows to maintain form height (usually 15 rows total)
  const emptyRowsNeeded = Math.max(0, 15 - safeItems.length);
  const emptyRows = Array(emptyRowsNeeded).fill(null);

  return (
    <div className="bg-white p-[0.5in] w-[8.5in] mx-auto text-slate-900 leading-tight font-serif min-h-[11in] flex flex-col">
      {/* Official Header */}
      <div className="flex items-center justify-between mb-2 border-b-2 border-slate-900 pb-2 relative">
        <div className="absolute left-0 top-0">
          <img src={LINKS.GSO_LOGO} alt="GSO Logo" className="w-16 h-16 object-contain" />
        </div>
        <div className="text-center w-full">
          <h1 className="text-xl font-bold uppercase tracking-tight">Purchase Request</h1>
          <p className="text-[10px] italic">Republic of the Philippines</p>
          <p className="text-sm font-bold uppercase">PROVINCE OF QUEZON</p>
          <p className="text-[10px] uppercase">Municipality of Pagbilao</p>
          <p className="text-xs font-bold mt-1">{data.department || 'GOVERNMENT SERVICE OFFICE'}</p>
        </div>
      </div>

      <div className="border-2 border-slate-900">
        {/* Top Meta Info */}
        <div className="grid grid-cols-2 border-b-2 border-slate-900">
          <div className="p-2 border-r-2 border-slate-900">
            <p className="text-[10px] font-bold">Entity Name:</p>
            <p className="text-sm font-bold pl-4">{data.department || '____________________'}</p>
          </div>
          <div className="p-2">
            <p className="text-[10px] font-bold">Fund Cluster:</p>
            <p className="text-sm pl-4 underline decoration-dotted">{data.budget || '____________________'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 border-b-2 border-slate-900">
          <div className="p-2 border-r-2 border-slate-900 flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold">Office/Section:</span>
              <span className="text-sm font-bold border-b border-slate-900 flex-1 ml-2">{data.section || 'GSO'}</span>
            </div>
          </div>
          <div className="p-2 space-y-1">
            <div className="flex justify-between">
              <span className="text-[10px] font-bold">PR No.:</span>
              <span className="text-sm font-bold border-b border-slate-900 flex-1 ml-2">{data.pr || 'PENDING'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] font-bold">Responsibility Center Code:</span>
              <span className="text-sm border-b border-slate-900 flex-1 ml-2 text-center font-mono">101</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] font-bold">Date:</span>
              <span className="text-sm border-b border-slate-900 flex-1 ml-2">{format(new Date(data.date), 'MMMM dd, yyyy')}</span>
            </div>
          </div>
        </div>

        {/* Table Header */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900 text-[10px] font-bold bg-slate-50 uppercase text-center">
              <th className="border-r-2 border-slate-900 p-1 w-20">Stock / Property No.</th>
              <th className="border-r-2 border-slate-900 p-1 w-16">Unit</th>
              <th className="border-r-2 border-slate-900 p-1">Item Description</th>
              <th className="border-r-2 border-slate-900 p-1 w-16">Qty.</th>
              <th className="border-r-2 border-slate-900 p-1 w-24">Unit Cost</th>
              <th className="p-1 w-32">Total Cost</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {safeItems.map((item, idx) => (
              <tr key={`pr-print-item-${item?.id || 'idx-' + idx}`} className="border-b border-slate-400 align-top">
                <td className="border-r-2 border-slate-900 p-2 text-center text-[10px] font-mono">{item?.stock_no || idx + 1}</td>
                <td className="border-r-2 border-slate-900 p-2 text-center">{item?.unit}</td>
                <td className="border-r-2 border-slate-900 p-2 italic leading-tight">
                  <div className="font-bold mb-1 uppercase">{item?.item_description}</div>
                  <div className="text-[10px] text-slate-500">*** details follows ***</div>
                </td>
                <td className="border-r-2 border-slate-900 p-2 text-center font-bold">{item?.qty}</td>
                <td className="border-r-2 border-slate-900 p-2 text-right">₱{item?.unit_cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="p-2 text-right font-bold">₱{item?.total_cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            {emptyRows.map((_, idx) => (
              <tr key={`pr-empty-row-${idx}`} className="border-b border-slate-400 h-8">
                <td className="border-r-2 border-slate-900 p-2"></td>
                <td className="border-r-2 border-slate-900 p-2"></td>
                <td className="border-r-2 border-slate-900 p-2 text-center text-slate-200 uppercase text-[8px] italic">{idx === 0 ? 'NOTHING FOLLOWS' : ''}</td>
                <td className="border-r-2 border-slate-900 p-2"></td>
                <td className="border-r-2 border-slate-900 p-2"></td>
                <td className="p-2"></td>
              </tr>
            ))}
            {/* Grand Total Row */}
            <tr className="border-t-2 border-slate-900 font-bold bg-slate-50">
              <td colSpan={5} className="border-r-2 border-slate-900 p-2 text-right uppercase text-[10px]">TOTAL</td>
              <td className="p-2 text-right text-sm">₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        {/* Purpose */}
        <div className="p-4 border-t-2 border-slate-900">
          <p className="text-[10px] font-bold">Purpose:</p>
          <p className="text-sm pl-4 italic min-h-[60px]">{data.remarks || 'Supply replenishment for operational use.'}</p>
        </div>

        {/* Signatories */}
        <div className="grid grid-cols-2 border-t-2 border-slate-900">
          <div className="flex flex-col border-r-2 border-slate-900">
            <div className="p-2 border-b border-slate-900 bg-slate-50">
              <p className="text-[10px] font-bold">Requested by:</p>
            </div>
            <div className="p-8 flex-1 flex flex-col items-center justify-end">
              <div className="w-full border-b border-slate-900 text-center font-bold text-sm uppercase">
                {data.requested_by}
              </div>
              <p className="text-[8px] italic mt-1 uppercase">Printed Name and Designation</p>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="p-2 border-b border-slate-900 bg-slate-50">
              <p className="text-[10px] font-bold">Approved by:</p>
            </div>
            <div className="p-8 flex-1 flex flex-col items-center justify-end relative">
              {(isOfficial || data.bac) && (
                <img 
                  src={LINKS.SIGNATURE} 
                  alt="Signature" 
                  className="absolute bottom-6 w-32 h-16 object-contain opacity-80 pointer-events-none" 
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="w-full border-b border-slate-900 text-center font-bold text-sm uppercase relative z-10">
                ADMINISTRATOR / HEAD OF OFFICE
              </div>
              <p className="text-[8px] italic mt-1 uppercase">Printed Name and Designation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-auto pt-8 flex justify-between items-end">
        <div className="text-[8px] text-slate-400 italic">
          System Generated GSOID: {gsoid} | Generated on {format(new Date(), 'PPpp')}
        </div>
        {!isOfficial && (
          <div className="border border-red-500 text-red-500 text-[10px] font-bold px-4 py-2 rotate-[-5deg] opacity-50 uppercase">
            Not Valid for Billing - Pending Approval
          </div>
        )}
      </div>
    </div>
  );
}

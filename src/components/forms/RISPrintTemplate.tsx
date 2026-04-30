import React from 'react';
import { format } from 'date-fns';
import { LineItem } from '../../types';
import { LINKS } from '../../constants';

interface RISPrintTemplateProps {
  data: {
    department: string;
    date: string;
    requested_by: string;
    remarks?: string;
  };
  items: Partial<LineItem>[];
  gsoid: string;
}

export default function RISPrintTemplate({ data, items = [], gsoid }: RISPrintTemplateProps) {
  const safeItems = Array.isArray(items) ? items : [];
  // Fill empty rows to maintain form height (usually 12 rows total)
  const emptyRowsNeeded = Math.max(0, 12 - safeItems.length);
  const emptyRows = Array(emptyRowsNeeded).fill(null);

  return (
    <div className="bg-white p-[0.5in] w-[8.5in] mx-auto text-slate-900 leading-tight font-serif min-h-[11in] flex flex-col">
      {/* Official Header */}
      <div className="flex items-center justify-between mb-2 border-b-2 border-slate-900 pb-2 relative">
        <div className="absolute left-0 top-0">
          <img src={LINKS.GSO_LOGO} alt="GSO Logo" className="w-16 h-16 object-contain" />
        </div>
        <div className="text-center w-full">
          <h1 className="text-xl font-bold uppercase tracking-tight">Requisition and Issue Slip</h1>
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
            <p className="text-sm font-bold pl-4 uppercase">{data.department || '____________________'}</p>
          </div>
          <div className="p-2">
            <p className="text-[10px] font-bold">Fund Cluster:</p>
            <p className="text-sm pl-4 underline decoration-dotted">General Fund</p>
          </div>
        </div>

        <div className="grid grid-cols-2 border-b-2 border-slate-900">
          <div className="p-2 border-r-2 border-slate-900">
            <p className="text-[10px] font-bold">Division:</p>
            <p className="text-sm pl-4 uppercase">{data.department || '____________________'}</p>
            <p className="text-[10px] font-bold mt-2">Office:</p>
            <p className="text-sm pl-4 uppercase">____________________</p>
          </div>
          <div className="p-2 space-y-1">
            <div className="flex justify-between">
              <span className="text-[10px] font-bold">Responsibility Center Code:</span>
              <span className="text-sm border-b border-slate-900 flex-1 ml-2 text-center font-mono">2024-XX</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] font-bold">RIS No.:</span>
              <span className="text-sm border-b border-slate-900 flex-1 ml-2 font-bold italic">PENDING</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] font-bold">Date:</span>
              <span className="text-sm border-b border-slate-900 flex-1 ml-2">{format(new Date(data.date), 'MMMM dd, yyyy')}</span>
            </div>
          </div>
        </div>

        {/* Requisition Table */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900 text-[10px] font-bold bg-slate-50 uppercase text-center">
              <th rowSpan={2} className="border-r-2 border-slate-900 p-1 w-16">Stock No.</th>
              <th rowSpan={2} className="border-r-2 border-slate-900 p-1 w-12">Unit</th>
              <th rowSpan={2} className="border-r-2 border-slate-900 p-1">Description</th>
              <th colSpan={2} className="border-r-2 border-slate-900 p-1 border-b">Requisition</th>
              <th colSpan={2} className="border-r-2 border-slate-900 p-1 border-b">Issuance</th>
            </tr>
            <tr className="border-b-2 border-slate-900 text-[8px] font-bold bg-slate-50 uppercase text-center">
              <th className="border-r-2 border-slate-900 p-1 w-12 text-center">Qty.</th>
              <th className="border-r-2 border-slate-900 p-1 w-12">Yes/No</th>
              <th className="border-r-2 border-slate-900 p-1 w-12">Qty.</th>
              <th className="p-1 w-20">Remarks</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {safeItems.map((item, idx) => (
              <tr key={`ris-print-item-${item?.id || 'idx-' + idx}`} className="border-b border-slate-400 align-top">
                <td className="border-r-2 border-slate-900 p-2 text-center text-[10px] font-mono">{idx + 1}</td>
                <td className="border-r-2 border-slate-900 p-2 text-center font-bold uppercase">{item?.unit}</td>
                <td className="border-r-2 border-slate-900 p-2 leading-tight uppercase font-bold">{item?.item_description}</td>
                <td className="border-r-2 border-slate-900 p-2 text-center font-bold text-sm bg-blue-50/20">{item?.qty}</td>
                <td className="border-r-2 border-slate-900 p-2 text-center">Yes</td>
                <td className="border-r-2 border-slate-900 p-2 text-center bg-slate-100 italic">pending</td>
                <td className="p-2 bg-slate-100"></td>
              </tr>
            ))}
            {emptyRows.map((_, idx) => (
              <tr key={`ris-empty-row-${idx}`} className="border-b border-slate-400 h-8">
                <td className="border-r-2 border-slate-900 p-2"></td>
                <td className="border-r-2 border-slate-900 p-2"></td>
                <td className="border-r-2 border-slate-900 p-2 text-center text-slate-200 uppercase text-[8px] italic">{idx === 0 ? '--- NOTHING FOLLOWS ---' : ''}</td>
                <td className="border-r-2 border-slate-900 p-2"></td>
                <td className="border-r-2 border-slate-900 p-2"></td>
                <td className="border-r-2 border-slate-900 p-2"></td>
                <td className="p-2"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Purpose */}
        <div className="p-4 border-t-2 border-slate-900">
          <p className="text-[10px] font-bold">Purpose:</p>
          <p className="text-sm pl-4 italic min-h-[40px] uppercase font-bold">{data.remarks || 'OFFICE CONSUMPTION / OPERATIONS'}</p>
        </div>

        {/* Signatories Grid */}
        <div className="grid grid-cols-4 border-t-2 border-slate-900 text-[8px]">
          <div className="border-r-2 border-slate-900 flex flex-col">
            <div className="p-1 border-b border-slate-900 font-bold">Requested by:</div>
            <div className="mt-8 px-1 text-center font-bold uppercase border-b border-slate-400 mx-2">{data.requested_by}</div>
            <div className="text-center font-bold uppercase py-1">Head of Office</div>
          </div>
          <div className="border-r-2 border-slate-900 flex flex-col relative">
            <div className="p-1 border-b border-slate-900 font-bold">Approved by:</div>
            <img 
              src={LINKS.SIGNATURE} 
              alt="Signature" 
              className="absolute bottom-4 left-1/2 -translate-x-1/2 w-20 h-10 object-contain opacity-70 pointer-events-none" 
              referrerPolicy="no-referrer"
            />
            <div className="mt-8 px-1 text-center font-bold uppercase border-b border-slate-400 mx-2 relative z-10">____________________</div>
            <div className="text-center font-bold uppercase py-1">GSO Head</div>
          </div>
          <div className="border-r-2 border-slate-900 flex flex-col">
            <div className="p-1 border-b border-slate-900 font-bold">Issued by:</div>
            <div className="mt-8 px-1 text-center font-bold uppercase border-b border-slate-400 mx-2">____________________</div>
            <div className="text-center font-bold uppercase py-1">Supply Officer</div>
          </div>
          <div className="flex flex-col">
            <div className="p-1 border-b border-slate-900 font-bold">Received by:</div>
            <div className="mt-8 px-1 text-center font-bold uppercase border-b border-slate-400 mx-2">____________________</div>
            <div className="text-center font-bold uppercase py-1">Recipient</div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-between items-end italic text-[8px] text-slate-400">
        <div>System Tracker GSOID: {gsoid} | Auto-deduct inventory on approval</div>
        <div>{format(new Date(), 'PPpp')}</div>
      </div>
    </div>
  );
}

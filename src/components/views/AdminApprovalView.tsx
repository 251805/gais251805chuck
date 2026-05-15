import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  Printer, 
  ExternalLink,
  Download,
  Save,
  X,
  FileText,
  AlertCircle,
  XCircle,
  SaveAll,
  CheckCircle,
  Link
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { GSOIDRecord, LineItem } from '../../types';
import { format } from 'date-fns';
import { generatePurchaseRequestDocx, generateRISDocx } from '../../utils/docxGenerator';
import PRPrintTemplate from '../forms/PRPrintTemplate';
import RISPrintTemplate from '../forms/RISPrintTemplate';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminApprovalView() {
  const [requests, setRequests] = useState<GSOIDRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'DISCREPANCY'>('PENDING');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PR' | 'RIS'>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<GSOIDRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isInherited, setIsInherited] = useState(false);

  // Rejection State
  const [isConfirmingReject, setIsConfirmingReject] = useState(false);
  const [tempRejectReason, setTempRejectReason] = useState('');

  // Edit fields
  const [editFields, setEditFields] = useState({
    pr: '',
    budget: '',
    bac: '',
    remarks: ''
  });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('gsoid')
        .select(`
          *,
          items:line_items(*)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, typeFilter]);

  const handleOpenRequest = async (request: GSOIDRecord) => {
    setSelectedRequest(request);
    setIsInherited(false);

    let initialPR = request.pr || '';
    let initialBudget = request.budget || '';
    let initialBAC = request.bac || '';

    // Automated Inheritance Logic (Path B: Linked RIS)
    if (request.type === 'RIS' && request.is_linked && request.linked_id) {
      try {
        const { data: parentData, error: parentError } = await supabase
          .from('gsoid')
          .select('pr, budget, bac')
          .eq('id', request.linked_id)
          .single();

        if (!parentError && parentData) {
          // Only inherit if child fields are empty
          const inheritedPR = !initialPR.trim() ? parentData.pr || '' : initialPR;
          const inheritedBudget = !initialBudget.trim() ? parentData.budget || '' : initialBudget;
          const inheritedBAC = !initialBAC.trim() ? parentData.bac || '' : initialBAC;

          // Check if anything was actually inherited
          if (inheritedPR !== initialPR || inheritedBudget !== initialBudget || inheritedBAC !== initialBAC) {
            initialPR = inheritedPR;
            initialBudget = inheritedBudget;
            initialBAC = inheritedBAC;
            setIsInherited(true);
          }
        }
      } catch (err) {
        console.error('Error fetching parent PR data:', err);
      }
    }

    setEditFields({
      pr: initialPR,
      budget: initialBudget,
      bac: initialBAC,
      remarks: request.admin_remarks ? request.admin_remarks.split(/^(?:PENDING|APPROVED|REJECTED)-/)[1] || request.admin_remarks : ''
    });
    
    setIsConfirmingReject(false);
    setTempRejectReason('');
    setIsModalOpen(true);
  };

  const handleSaveDraft = async () => {
    if (!selectedRequest) return;
    setIsSaving(true);
    try {
      const concatenatedRemarks = editFields.remarks.trim() 
        ? `PENDING-${editFields.remarks.trim()}` 
        : '';

      const { error } = await supabase
        .from('gsoid')
        .update({
          pr: editFields.pr,
          budget: editFields.budget,
          bac: editFields.bac,
          admin_remarks: concatenatedRemarks,
          status: 'PENDING'
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;
      
      setRequests(prev => prev.map(r => 
        r.id === selectedRequest.id 
          ? { 
              ...r, 
              pr: editFields.pr, 
              budget: editFields.budget, 
              bac: editFields.bac, 
              admin_remarks: concatenatedRemarks, 
              status: 'PENDING' 
            } 
          : r
      ));
      
      setIsModalOpen(false);
      setSelectedRequest(null);
      alert("Draft Saved Successfully.");
    } catch (err) {
      console.error('Error saving draft:', err);
      alert('Failed to save draft.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    // Path A vs Path B Logic
    const isOfficeSupply = selectedRequest.type === 'RIS' && !selectedRequest.is_linked;
    const hasTechnicalFields = 
      editFields.pr.trim() !== '' && 
      editFields.budget.trim() !== '' && 
      editFields.bac.trim() !== '';

    if (!isOfficeSupply && !hasTechnicalFields) {
      alert("Please fill in PR, Budget, and BAC codes before approving.");
      return;
    }

    setIsSaving(true);
    try {
      const concatenatedRemarks = editFields.remarks.trim() 
        ? `APPROVED-${editFields.remarks.trim()}` 
        : '';

      // 1. Update the Current Request
      const { error } = await supabase
        .from('gsoid')
        .update({
          pr: editFields.pr,
          budget: editFields.budget,
          bac: editFields.bac,
          admin_remarks: concatenatedRemarks,
          status: 'APPROVED'
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      // Update dedicated ris_requests table if applicable
      if (selectedRequest.type === 'RIS') {
        await supabase
          .from('ris_requests')
          .update({ 
            status: 'APPROVED',
            updated_at: new Date().toISOString()
          })
          .eq('gsoid', selectedRequest.id)
          .eq('status', 'PENDING');
      }

      // 2. Pioneer Logic: Bi-Directional Update for Path B (Bulk RIS)
      if (selectedRequest.is_linked && selectedRequest.linked_id) {
        // Fetch parent status
        const { data: parent } = await supabase
          .from('gsoid')
          .select('status')
          .eq('id', selectedRequest.linked_id)
          .single();

        if (parent && parent.status === 'PENDING') {
          // Sync approved data back to parent PR if it's still pending
          await supabase
            .from('gsoid')
            .update({
              pr: editFields.pr,
              budget: editFields.budget,
              bac: editFields.bac,
              admin_remarks: concatenatedRemarks,
              status: 'APPROVED' // As requested: Set Parent PR to APPROVED if Linked RIS is approved
            })
            .eq('id', selectedRequest.linked_id);
        }
      }
      
      // 3. Update Local State
      setRequests(prev => prev.map(r => {
        if (r.id === selectedRequest.id) {
          return { 
            ...r, 
            pr: editFields.pr, 
            budget: editFields.budget, 
            bac: editFields.bac, 
            admin_remarks: concatenatedRemarks, 
            status: 'APPROVED' 
          };
        }
        // If parent is in the local list, update it too
        if (selectedRequest.is_linked && r.id === selectedRequest.linked_id && r.status === 'PENDING') {
          return { 
            ...r, 
            pr: editFields.pr, 
            budget: editFields.budget, 
            bac: editFields.bac, 
            admin_remarks: concatenatedRemarks, 
            status: 'APPROVED' 
          };
        }
        return r;
      }));
      
      setIsModalOpen(false);
      setSelectedRequest(null);
      alert("Request Approved and Synced with Parent!");
    } catch (err) {
      console.error('Error approving:', err);
      alert('Failed to approve request. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    if (!isConfirmingReject) {
      setIsConfirmingReject(true);
      return;
    }

    if (!tempRejectReason.trim()) {
      alert("A reason for rejection is mandatory.");
      return;
    }

    setIsSaving(true);
    try {
      const concatenatedRemarks = tempRejectReason.trim() 
        ? `REJECTED-${tempRejectReason.trim()}` 
        : 'REJECTED';

      const { error } = await supabase
        .from('gsoid')
        .update({
          status: 'DISCREPANCY',
          admin_remarks: concatenatedRemarks
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      setRequests(prev => prev.map(r => 
        r.id === selectedRequest.id 
          ? { ...r, status: 'DISCREPANCY', admin_remarks: concatenatedRemarks } 
          : r
      ));
      
      setIsModalOpen(false);
      setSelectedRequest(null);
      setIsConfirmingReject(false);
      setTempRejectReason('');
      alert(`Request ${selectedRequest.id} has been Rejected.`);
    } catch (err) {
      console.error('Rejection error:', err);
      alert('Failed to reject.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadDocx = async () => {
    if (!selectedRequest) return;
    try {
      // Use editFields to ensure the latest approved/pending codes are used
      const mappedData = {
        ...selectedRequest,
        pr: editFields.pr || '',
        budget: editFields.budget || '',
        bac: editFields.bac || '',
        remarks: selectedRequest.remarks || '',
        admin_remarks: currentAdminRemarks,
        status: selectedRequest.status,
        section: selectedRequest.items?.[0]?.section || ''
      };

      if (selectedRequest.type === 'PR') {
        await generatePurchaseRequestDocx(
          mappedData,
          selectedRequest.items || [],
          selectedRequest.id
        );
      } else {
        await generateRISDocx(
          mappedData,
          selectedRequest.items || [],
          selectedRequest.id
        );
      }
      
      setIsModalOpen(false);
      setSelectedRequest(null);
    } catch (err) {
      console.error(err);
      alert('Failed to generate DOCX');
    }
  };

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requested_by.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || req.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Calculate the prefixed admin remarks based on current status and edit fields for real-time sync with print/download
  const getPrefixedAdminRemarks = () => {
    if (!selectedRequest) return '';
    const statusPrefix = selectedRequest.status === 'APPROVED' || selectedRequest.status === 'COMPLETE' 
      ? 'APPROVED-' 
      : (selectedRequest.status === 'DISCREPANCY' ? 'REJECTED-' : 'PENDING-');
    
    return editFields.remarks.trim() 
      ? `${statusPrefix}${editFields.remarks.trim()}` 
      : (selectedRequest.admin_remarks || '');
  };

  const currentAdminRemarks = getPrefixedAdminRemarks();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ShieldCheck className="text-blue-600" size={32} />
            Administrative Approval
          </h1>
          <p className="text-slate-500 font-medium">Review and finalize procurement requests</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex border-r border-slate-200 pr-2 mr-2">
            {(['ALL', 'PR', 'RIS'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  typeFilter === type ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          {(['PENDING', 'APPROVED', 'DISCREPANCY', 'ALL'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === filter ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {filter === 'DISCREPANCY' ? 'REJECTED' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex items-center gap-4">
          <div className="p-4 bg-amber-500 rounded-2xl text-white">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Pending</p>
            <p className="text-2xl font-black text-slate-900">{requests.filter(r => r.status === 'PENDING').length}</p>
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl flex items-center gap-4">
          <div className="p-4 bg-emerald-500 rounded-2xl text-white">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Approved</p>
            <p className="text-2xl font-black text-slate-900">{requests.filter(r => r.status === 'APPROVED').length}</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-100 p-6 rounded-3xl flex items-center gap-4">
          <div className="p-4 bg-red-500 rounded-2xl text-white">
            <XCircle size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Rejected</p>
            <p className="text-2xl font-black text-slate-900">{requests.filter(r => r.status === 'DISCREPANCY' || r.status === 'REJECTED').length}</p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl flex items-center gap-4">
          <div className="p-4 bg-blue-500 rounded-2xl text-white">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Total Today</p>
            <p className="text-2xl font-black text-slate-900">{requests.length}</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
        <input 
          type="text" 
          placeholder="Search by GSOID or Name"
          className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 transition-all shadow-sm outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">GSOID</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Requester / Dept</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="px-6 py-4"><div className="h-8 bg-slate-100 rounded-lg w-full" /></td>
                  </tr>
                ))
              ) : filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-mono font-black text-slate-900 group-hover:text-blue-600">{request.id}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{request.type}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800">{request.requested_by}</p>
                    <p className="text-xs text-slate-500">{request.department}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${
                      request.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                      request.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                      (request.status === 'REJECTED' || request.status === 'DISCREPANCY') ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {request.status === 'DISCREPANCY' ? 'REJECTED' : request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleOpenRequest(request)}
                      className="p-2 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-xl transition-all"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && selectedRequest && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative z-20"
            >
              <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600 rounded-2xl shadow-lg">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">Request Review</h2>
                    <p className="text-xs text-blue-400 font-bold font-mono">{selectedRequest.id}</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-xl"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                 {(selectedRequest.status === 'REJECTED' || selectedRequest.status === 'DISCREPANCY') && (
                  <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-700">
                    <AlertCircle size={24} className="shrink-0" />
                    <div>
                      <p className="font-black uppercase text-xs">Request Rejected</p>
                      <p className="text-xs font-medium opacity-80">Reason: {selectedRequest.admin_remarks || 'No reason provided.'}</p>
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Technical Info</h3>
                      {isInherited && (
                        <motion.div 
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100"
                        >
                          <Link size={10} className="stroke-[3]" />
                          <span className="text-[9px] font-black uppercase tracking-tight">Inherited from Parent PR</span>
                        </motion.div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase">PR Number</label>
                        <input 
                          type="text" 
                          className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none text-sm font-mono"
                          value={editFields.pr}
                          onChange={(e) => setEditFields({ ...editFields, pr: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Budget Code</label>
                        <input 
                          type="text" 
                          className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none text-sm font-mono"
                          value={editFields.budget}
                          onChange={(e) => setEditFields({ ...editFields, budget: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">BAC Code</label>
                      <input 
                        type="text" 
                        className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none text-sm font-mono"
                        value={editFields.bac}
                        onChange={(e) => setEditFields({ ...editFields, bac: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase">Department</p>
                        <p className="font-bold text-slate-800 uppercase">{selectedRequest.department}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase">Type</p>
                        <p className="font-bold text-slate-800 uppercase">{selectedRequest.type}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase">Created At</p>
                        <p className="font-bold text-slate-800">{format(new Date(selectedRequest.created_at), 'PPP')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Tracking GSOID</p>
                        <p className="font-bold text-blue-600 font-mono underline decoration-dotted">{selectedRequest.id}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase">Requested By</p>
                      <p className="font-bold text-slate-800 uppercase">{selectedRequest.requested_by}</p>
                    </div>
                    {selectedRequest.remarks && (
                      <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">User's Purpose / Remarks:</p>
                        <p className="text-xs font-bold text-slate-700 italic uppercase leading-relaxed">{selectedRequest.remarks}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">Line Items</h3>
                  <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-slate-100/50 text-[10px] font-black text-slate-500 uppercase">
                          <th className="px-4 py-3">Stock No.</th>
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3">Unit</th>
                          <th className="px-4 py-3 text-center">Qty</th>
                          <th className="px-4 py-3 text-right">Total Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedRequest.items?.map((item, idx) => (
                          <tr key={idx} className="text-slate-700 hover:bg-white transition-colors">
                            <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{item.stock_no || idx + 1}</td>
                            <td className="px-4 py-3 font-bold text-slate-900 uppercase tracking-tight">
                              {item.item_description}
                              {item.section && <span className="block text-[8px] text-slate-400 font-medium italic uppercase mt-0.5">Section: {item.section}</span>}
                            </td>
                            <td className="px-4 py-3 font-medium uppercase text-xs">{item.unit}</td>
                            <td className="px-4 py-3 text-center font-black text-blue-600">{item.qty}</td>
                            <td className="px-4 py-3 text-right font-mono font-black text-slate-900">₱{item.total_cost.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Admin Remarks</label>
                  <textarea 
                    className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none text-sm h-24 resize-none"
                    placeholder="Instructions or updates..."
                    value={editFields.remarks}
                    onChange={(e) => setEditFields({ ...editFields, remarks: e.target.value })}
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-6 border-t border-slate-100 flex flex-col gap-4">
                {isConfirmingReject ? (
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center gap-3 text-red-700">
                      <AlertCircle size={20} />
                      <p className="text-xs font-black uppercase">Mandatory Rejection Reason</p>
                    </div>
                    <textarea 
                      autoFocus
                      className="w-full p-4 bg-white rounded-2xl border-2 border-red-100 focus:border-red-500 outline-none text-sm h-24 resize-none"
                      placeholder="Explain why this request is being rejected..."
                      value={tempRejectReason}
                      onChange={(e) => setTempRejectReason(e.target.value)}
                    />
                    <div className="flex gap-3">
                      <button onClick={() => setIsConfirmingReject(false)} className="flex-1 px-4 py-3 bg-white text-slate-500 font-black uppercase text-[10px] tracking-widest rounded-xl border border-slate-200">Cancel</button>
                      <button onClick={handleReject} disabled={isSaving} className="flex-1 px-4 py-3 bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-red-600/20 disabled:opacity-50">{isSaving ? 'Processing...' : 'Confirm Rejection'}</button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <button 
                      onClick={() => { setIsModalOpen(false); setSelectedRequest(null); }}
                      className="px-4 py-3 bg-white hover:bg-slate-100 text-slate-500 font-black uppercase text-[10px] tracking-widest rounded-xl border border-slate-200 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <X size={14} /><span>Cancel</span>
                    </button>
                    <button 
                      onClick={handleDownloadDocx}
                      className="px-4 py-3 bg-white hover:bg-slate-100 text-blue-600 font-black uppercase text-[10px] tracking-widest rounded-xl border border-blue-100 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <Download size={14} /><span>Download DOCX</span>
                    </button>
                    <button 
                      onClick={handleSaveDraft}
                      disabled={isSaving}
                      className="px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-black uppercase text-[10px] tracking-widest rounded-xl border border-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Save size={14} /><span>{isSaving ? '...' : 'Save Draft'}</span>
                    </button>
                    <button 
                      onClick={handleApprove}
                      disabled={isSaving || selectedRequest.status === 'REJECTED' || selectedRequest.status === 'DISCREPANCY'}
                      className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <CheckCircle size={14} /><span>{isSaving ? '...' : 'Approve'}</span>
                    </button>
                    <button 
                      onClick={handleReject}
                      disabled={isSaving}
                      className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <XCircle size={14} /><span>{isSaving ? '...' : 'Reject'}</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden Print Content */}
      <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-[9999] overflow-visible h-auto">
        {selectedRequest && (
          selectedRequest.type === 'PR' ? (
            <PRPrintTemplate 
              data={{
                ...selectedRequest,
                pr: editFields.pr || '',
                budget: editFields.budget || '',
                bac: editFields.bac || '',
                remarks: selectedRequest.remarks || '',
                admin_remarks: currentAdminRemarks,
                section: selectedRequest.items?.[0]?.section || ''
              }}
              items={selectedRequest.items || []}
              gsoid={selectedRequest.id}
              isOfficial={true}
            />
          ) : (
            <RISPrintTemplate 
              data={{
                ...selectedRequest,
                pr: editFields.pr || '',
                budget: editFields.budget || '',
                bac: editFields.bac || '',
                remarks: selectedRequest.remarks || '',
                admin_remarks: currentAdminRemarks,
                section: selectedRequest.items?.[0]?.section || ''
              }}
              items={selectedRequest.items || []}
              gsoid={selectedRequest.id}
            />
          )
        )}
      </div>
    </div>
  );
}

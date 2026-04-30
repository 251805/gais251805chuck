export type Role = 'GUEST' | 'ADMIN' | 'WAREHOUSE' | 'ROOT';

export interface GSOIDRecord {
  id: string; // The GSOIDMMDDYYXXX
  pr?: string;
  budget?: string;
  bac?: string;
  department: string;
  date: string;
  requested_by: string;
  status: 'PENDING' | 'APPROVED' | 'COMPLETE' | 'DISCREPANCY';
  type: 'PR' | 'RIS';
  items: LineItem[];
  remarks?: string;
  actual_items_received?: number;
  created_at: string;
}

export interface LineItem {
  id: string;
  section?: string;
  stock_no?: string;
  unit: string;
  item_description: string;
  qty: number;
  unit_cost: number;
  total_cost: number;
}

export interface InventoryItem {
  id: string;
  item_description: string;
  unit: string;
  stock_no?: string;
  quantity_on_hand: number;
  unit_cost: number;
  updated_at: string;
}

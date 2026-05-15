# GSO Procurement & Inventory System (GPIS)
## Comprehensive Technical Manual & User Guide

This document outlines the end-to-end operational cycle of the GSO Procurement System, designed for RA 9184 compliance and real-time inventory tracking.

---

### 1. System Overview & Architecture

The GPIS is a unified smart municipality platform that bridges the gap between procurement requests and inventory management. It utilizes a centralized "GSOID" tracking system to ensure every item is accounted for from requisition to physical release.

#### Core Logic: The GSOID Lifecycle
Every request is assigned a unique GSOID (Format: `MMDDYYXXX`). This ID remains the "Master Source of Truth" throughout the following phases:
1.  **Request Generation** (Guest)
2.  **Administrative Approval** (Admin)
3.  **Delivery & Receiving** (Warehouse)
4.  **Issuance & Stock Deduction** (Warehouse)

---

### 2. Phase 1: Request Generation (Guest)

**Role:** Guest (No Auth Required)
**Available Actions:** Create Purchase Request (PR) or Requisition and Issue Slip (RIS).

*   **Purchase Request (PR):** For items that need to be purchased. Includes mandatory fields like Department, Purpose, and Item Details.
*   **RIS Path A (Small Supplies):** For immediate stock replenishment from the warehouse.
*   **Status Tracking:** Users can query their GSOID at any time to see the current status. Pending requests are marked in **Amber**.

---

### 3. Phase 2: Administrative Approval (Admin)

**Role:** Admin (Dojie)
**Required Data:** PR Number, Budget Code, BAC Resolution Number.

The Admin reviews pending GSOIDs and performs the following:
*   Encodes the official **PR**, **Budget**, and **BAC** codes.
*   Applies **Pioneer Logic**: If a request is linked (e.g., a bulk delivery), the system performs bi-directional status updates to ensure the entire chain is synchronized.
*   **Status Concatenation:** The system merges the base status with Admin Remarks for clear communication to the requesting department.

---

### 4. Phase 3: Warehouse & Inventory Integration

**Role:** Warehouse Staff
**Primary Tool:** Delivery & Receiving (DR) Module.

*   **Technical Inspection:** Upon arrival of items, Warehouse Staff uses the GSOID to verify items.
*   **DR Entry:** Staff inputs the actual quantity received and any discrepancies.
*   **Automated Inheritance:** Tagging a DR as **COMPLETE** triggers a database-level update to the `INVENTORY_MASTER`. Stock levels increase instantly across the dashboard.
*   **Bulk RIS (Path B):** For bulk deliveries, the system auto-generates linked RIS records to avoid double entry.

---

### 5. Phase 4: Final Issuance & Stock Deduction

**Role:** Warehouse Staff
**Primary Tool:** RIS Issuance Control.

*   **The Issuance Workflow:** When a user arrives with an approved GSOID for an RIS, the Warehouse Staff fetches the items in the system.
*   **Atomic Stock Deduction:** Clicking "ISSUE ITEM" performs a real-time deduction from `INVENTORY_MASTER`.
*   **Document Generation:** The system allows printing the official RIS and DR documents once the physical movement of goods is finalized.

---

### 6. User Manual: Step-by-Step Instructions

#### For Requesting Departments (Guests)
1.  **Select Role:** On the landing page, click **GUEST**.
2.  **Choose Form:** Select either **Purchase Request** (for new buys) or **RIS** (for stock).
3.  **Fill Mandatory Fields:** Ensure all fields with red borders are filled.
4.  **Submit & Save GSOID:** Copy the generated GSOID (e.g., `051124001`) to track your request.
5.  **Check Progress:** Use the **Status Checker** view to see if Dojie (Admin) has approved your request.

#### For Administrative Staff (Admin)
1.  **Login:** Use provided Admin credentials.
2.  **Navigate to Approval:** Go to the **Admin Approval** tab.
3.  **Approve Requests:** Search for pending GSOIDs, enter the PR/Budget/BAC details, and click **Approve**.

#### For Warehouse Personnel (Warehouse)
1.  **Receive Deliveries:** Use the **Warehouse View** -> **Delivery Receipts**. Enter the GSOID and confirm items received.
2.  **Issue Supplies:** Use the **Warehouse View** -> **RIS Issuance**. Enter the user's GSOID, verify approved items, and click **Issue Item**.

---

### 7. Technical Specifications & Role Access

| Role | Access Level | Responsibilities |
| :--- | :--- | :--- |
| **GUEST** | Read/Self-Insert | PR/RIS generation, Status query, Inventory peak view. |
| **ADMIN** | Full GSOID CRUD | PR/Budget/BAC data entry, Final Approval, Warehouse User Management. |
| **WAREHOUSE**| Inspection/Stock | DR entry, Stock Addition, RIS Issuance, Stock Deduction. |
| **ROOT** | Global Overlord | Hidden full system access, Role deletion/addition, Debugging. |

**System Requirements:**
*   **Source Code:** [GitHub Repository](https://github.com/251805/gais251805)
*   **Database:** Supabase (PostgreSQL) with RLS.
*   **Frontend:** React 18, Tailwind CSS, Motion.
*   **Auth:** Custom Session-based Role Logic.

---
*Created by Employee 251805. Distributed under Limited Usage License.*

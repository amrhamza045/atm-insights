export default `
# 8. Permissions & Access Reference

## 8.1 How access is resolved

1. **Platform role** — *admin* → **all permissions**, all branches, every module. A role makes its holders administrators only through its **Manage users — full administrator** switch; the Super Admin role follows the same switch. The safety-valve account always stays an administrator.
2. **Assigned role** — the role a person holds (assigned from HR) gives the permissions, modules, tabs and home page set for it in **Admin › Role Management**. Revoked staff (ex-employees) get nothing.
3. **Per-person changes** — *Admin › Users* can switch individual permissions, modules or tabs on or off for one person; everything else keeps following the role.
4. No role, or an inactive or missing role → no staff access.
5. Changes reach open sessions immediately, with a 15-second safety refresh. Returning to the app, focusing its window or reconnecting refreshes permissions, role and modules at once.
6. **Modules** closed in *Admin › Modules* stay closed for everyone. A denied parent module also denies its tabs.
7. Sensitive actions are re-checked **on the server** with the same permissions, and the data rules read a synced copy of them.

### One permission list

The permissions listed in **Admin › Role Management** are the complete list the app uses. The Users screen, the server checks and the data rules all read the same list, and nothing in the app grants access by role name.

## 8.2 Permissions by module

| Module | Permissions | Unlocks |
|---|---|---|
| Catering | catering_view, catering_edit, catering_finance, catering_settings_edit, requisition_view, requisition_submit, requisition_respond, requisition_release | Catering screens and requisitions; catering_settings_edit also saves Catering settings and bulk-deletes equipment |
| Kitchen Display | kds_view, kds_bar_view | Kitchen / Bar display |
| Selling Priority | selling_priority_manage | Push or slow down items: kitchen display holders set kitchen items, bar display holders set bar items; the Settings tabs permission sets every station |
| Delivery | delivery_view | Delivery Portal; its dashboards also need analytics_view; the delivery companies panel needs the Settings tabs |
| HR | attendance_checkin, hr_view_own, hr_view_all, hr_edit | Clock-in, own HR data, all staff data; hr_edit also edits and deletes operational meetings |
| CRM | clients_view, clients_edit, clients_merge, crm_full_view | CRM; crm_full_view opens every CRM panel and action |
| Marketing | admin_actions, social_media_view, marketing_view_segments | Campaigns and loyalty requests; Social Media; leads, segments, campaigns and website traffic |
| Manufacturing | manufacturing_view, manufacturing_edit | Manufacturing screens |
| Butchery | butchery_view, butchery_edit | Butchery screens |
| Cashier | cashier_view, cashier_edit, cashier_audit_view | Cashier sessions and audit tabs; cashier_edit also lists pending website orders in the notification bell |
| Finance | financial_view, finance_edit, finance_company_manage, finance_accounts_manage, finance_journal_create, finance_journal_approve, finance_period_close, finance_reconstruct, finance_audit_view | Finance workspace |
| Inventory | inventory_view, inventory_edit, inventory_manage (legacy) | Inventory Hub and printing |
| Expiry | expiry_manage | Expiry reports |
| Purchases | purchase_view, purchase_edit, purchase_approve | Purchases Hub, printing and PO approval |
| Support Customization | support_customization | Admin › Support Customization tab; on its own it opens the Admin panel with just that tab |
| POS | pos_view, pos_access (legacy), pos_edit, pos_delete, pos_approve | POS, printing and voice-order approval |
| Call Center | pos_call_center | Call center mode: phone orders go to the cashier for approval, without the till |
| Captain Orders | pos_captain | Captain mode: table orders go to the cashier for approval, without the till |
| Menu | menu_view, menu_create, menu_edit, menu_delete | Menu Management; menu_edit also approves Kitchen & Bar manual recipe cards |
| Analytics / Sales | analytics_view, sales_view | Executive Dashboard, Sales and the delivery dashboards |
| Cashback | rule_history_view | Cashback rule history |
| Rewards | redemptions_view, rewards_manage | rewards_manage: redeeming rewards for clients and the full Cashback History |
| Registrations | registrations_view | Registration requests |
| Loyalty (GenMo) | purchases_view, purchases_approve | Client purchase receipts |
| Users | users_manage | Full administrator |
| Approvals | one approval permission per queue, plus expiry_manage and review_moderate | The matching Approvals queue. catering_quote_approve also overrides a client's credit limit on a new quote. The notification bell lists pending registrations, payouts and level upgrades to holders of the matching approval permission, and customer quote decisions to catering_edit |
| Admin panel | admin_settings, admin_operations, admin_systems, settings_edit, clear_cache_view | The Admin sections. The Settings tabs also open Inventory Compliance, the delivery companies panel and manual regeneration; the Systems tabs also manage manual screenshots |

### Administrator-only

Admin › Users, Role Management, Modules, Approval Settings and the permission check page need **Manage users** (full administrator). Vendor support details are edited only by the software vendor's own account.

## 8.3 Roles

Roles are created and edited in **Admin › Role Management**; there are no built-in presets in the code. Each role sets its permissions, modules, tabs and home page, and saving a role updates everyone who holds it.

## 8.4 Pages and who reaches them

| Page | Requirement |
|---|---|
| / (landing), /EventPass, /EventRsvp | Public (guest invitation links) |
| /CateringPortal | Login linked to a client |
| /POS | pos_view / pos_access, or pos_call_center / pos_captain for order-taking mode |
| /CallCenterPOS | pos_view / pos_access or pos_call_center |
| /CaptainPOS | pos_view / pos_access or pos_captain |
| /Cashier | cashier_view |
| /KitchenDisplay | kds_view or kds_bar_view |
| /SellingPriority | Opens for inventory and menu editors; changing priorities needs selling_priority_manage or the Settings tabs |
| /DeliveryPortal | delivery_view |
| /InventoryHub | inventory_view, inventory_edit or inventory_manage |
| /PurchasesHub | purchase_view, purchase_edit or purchases_view |
| /MenuManagement | menu_view, menu_create, menu_edit or menu_delete |
| /Catering | catering_view, catering_edit, catering_approve or catering_finance |
| /Manufacturing | manufacturing_view or manufacturing_edit |
| /Butchery | butchery_view or butchery_edit |
| /CRM | clients_view, clients_edit or crm_full_view |
| /ClientAnalytics | clients_view or analytics_view |
| /Sales | sales_view |
| /ExecutiveDashboard | analytics_view or financial_view |
| /CashbackHistory | analytics_view, financial_view or rewards_manage |
| /Finance | financial_view |
| /Approvals | Any approval permission |
| /HRHub | hr_view_all, hr_edit or hr_attendance_approve |
| /EmployeeAttendance | attendance_checkin or hr_view_own |
| /Admin | Settings, Operations or Systems tabs, or support_customization (Support Customization tab only) |
| /MyCustody | Staff assigned on a trip |
| /SupportBot, /VeraKit360Manual, /SystemManual, /KitchenBarManual | Logged-in staff (manual regeneration needs the Settings tabs) |
`;
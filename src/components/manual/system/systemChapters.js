import overview from "./chapterOverview";
import superAdmin from "./chapterSuperAdmin";
import catering from "./chapterCatering";
import operations from "./chapterOperations";
import crmFinance from "./chapterCrmFinance";
import hrStaff from "./chapterHrStaff";
import clientsGuests from "./chapterClientsGuests";
import permissions from "./chapterPermissions";
import dataFlows from "./chapterDataFlows";

// Ordered table of contents for the role-based user manual.
export const SYSTEM_CHAPTERS = [
  { key: "overview", number: 1, title: "System Overview", audience: "Everyone", content: overview },
  { key: "super-admin", number: 2, title: "Super Administrator", audience: "Platform admins", content: superAdmin },
  { key: "catering", number: 3, title: "Catering Team", audience: "Managers, heads of kitchen/bar", content: catering },
  { key: "operations", number: 4, title: "Operations Staff", audience: "Cashier, captain, KDS, inventory, delivery", content: operations },
  { key: "crm-finance", number: 5, title: "CRM, Marketing & Finance", audience: "Marketing, accountants", content: crmFinance },
  { key: "hr-staff", number: 6, title: "HR & General Staff", audience: "HR, all employees", content: hrStaff },
  { key: "clients-guests", number: 7, title: "Clients & Guests", audience: "Customers, portal users, invitees", content: clientsGuests },
  { key: "permissions", number: 8, title: "Permissions & Access Reference", audience: "Admins", content: permissions },
  { key: "data-flows", number: 9, title: "Data Flows & Status Glossary", audience: "Admins, managers", content: dataFlows },
];
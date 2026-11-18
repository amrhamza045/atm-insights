import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBranchAccess, canUserAccessBranch } from './branchAccess.js';
import {
  planInventoryItemMirrors,
  mapIngredientsToBranch,
  copyBranchEquipmentAndVehicles,
} from './branchCatalogMirror.js';
import {
  buildBranchIsolationDiagnosis,
  executeApprovedBranchRepairs,
} from './branchIsolationEngine.js';
import { buildBranchInventoryMatcher } from './branchInventoryTransfer.js';

const BRANCHES = [
  { id: 'b-shrouk', name: 'Shrouk', is_default: true },
  { id: 'b-sherouk', name: 'Sherouk', is_default: false },
];

test('branch authorization boundaries allow central admin globally and lock branch staff to their branch', () => {
  const adminScope = evaluateBranchAccess({
    user: { email: 'admin@rosemary.com', role: 'admin' },
    permissions: { users_manage: true },
    branches: BRANCHES,
  });
  assert.equal(adminScope.globalAccess, true);
  assert.deepEqual(adminScope.authorizedBranchIds, ['b-shrouk', 'b-sherouk']);
  assert.equal(canUserAccessBranch(adminScope, 'b-shrouk'), true);
  assert.equal(canUserAccessBranch(adminScope, 'b-sherouk'), true);

  const staffScope = evaluateBranchAccess({
    user: {
      email: 'chef@rosemary.com',
      role: 'user',
      perm_has_branch: true,
      perm_branch_id: 'b-sherouk',
    },
    permissions: { branch_id: 'b-sherouk', users_manage: false },
    branches: BRANCHES,
  });
  assert.equal(staffScope.globalAccess, false);
  assert.equal(staffScope.lockedBranchId, 'b-sherouk');
  assert.deepEqual(staffScope.authorizedBranchIds, ['b-sherouk']);
  assert.equal(canUserAccessBranch(staffScope, 'b-sherouk'), true);
  assert.equal(canUserAccessBranch(staffScope, 'b-shrouk'), false);
});

test('automatic catalog mirroring creates zero-stock counterparts and is idempotent', () => {
  const sourceItem = {
    id: 'inv-sugar-shrouk',
    branch_id: 'b-shrouk',
    branch_name: 'Shrouk',
    name: 'سكر',
    category_id: 'cat-grocery',
    category_name: 'البقاله',
    quantity: 662,
    unit: 'kg',
    purchase_unit: 'weight',
    purchase_unit_label: 'kg',
    selling_unit: 'weight',
    selling_unit_label: 'kg',
    cost_per_unit: 38,
    low_stock_threshold: 10,
    storage_location_id: 'loc-main-shrouk',
    storage_location_name: 'Main Storage',
    expiry_date: '2027-01-01',
  };

  const storageLocations = [
    { id: 'loc-main-shrouk', branch_id: 'b-shrouk', name: 'Main Storage' },
    { id: 'loc-main-sherouk', branch_id: 'b-sherouk', name: 'Main Storage' },
  ];

  const plans = planInventoryItemMirrors({
    sourceItem,
    branches: BRANCHES,
    allInventoryItems: [sourceItem],
    storageLocations,
  });

  assert.equal(plans.length, 1);
  assert.equal(plans[0].branch_id, 'b-sherouk');
  assert.equal(plans[0].payload.quantity, 0);
  assert.equal(plans[0].payload.source_item_id, 'inv-sugar-shrouk');
  assert.equal(plans[0].payload.storage_location_id, 'loc-main-sherouk');
  assert.equal(sourceItem.quantity, 662);

  const existingTwin = { ...plans[0].payload, id: 'inv-sugar-sherouk' };
  const secondRun = planInventoryItemMirrors({
    sourceItem,
    branches: BRANCHES,
    allInventoryItems: [sourceItem, existingTwin],
    storageLocations,
  });
  assert.equal(secondRun.length, 0);
});

test('maps recipe ingredients to destination branch twins via source_item_id', () => {
  const shroukMilk = { id: 'milk-shrouk', branch_id: 'b-shrouk', name: 'لبن' };
  const sheroukMilk = {
    id: 'milk-sherouk',
    branch_id: 'b-sherouk',
    name: 'لبن',
    source_item_id: 'milk-shrouk',
  };
  const allById = new Map([
    [shroukMilk.id, shroukMilk],
    [sheroukMilk.id, sheroukMilk],
  ]);
  const sheroukMatcher = buildBranchInventoryMatcher([sheroukMilk]);

  const { mapped, unresolved } = mapIngredientsToBranch(
    [{ inventory_item_id: 'milk-shrouk', inventory_item_name: 'لبن', quantity_needed: 200, unit: 'ml' }],
    allById,
    sheroukMatcher
  );

  assert.equal(unresolved.length, 0);
  assert.equal(mapped[0].inventory_item_id, 'milk-sherouk');
});

test('diagnosis and approved repair engine relinks records, reconciles stock & journals idempotently, and leaves legacy recipes untouched', async () => {
  const fixture = {
    branches: BRANCHES,
    inventoryItems: [
      { id: 'sterno-shrouk', branch_id: 'b-shrouk', name: 'استيرنو', quantity: 78, cost_per_unit: 25 },
      { id: 'sterno-sherouk', branch_id: 'b-sherouk', name: 'استيرنو', source_item_id: 'sterno-shrouk', quantity: 0, cost_per_unit: 25 },
      { id: 'out-creme-shrouk', branch_id: 'b-shrouk', name: 'Creme Caramel', quantity: 5, cost_per_unit: 10 },
      { id: 'out-creme-sherouk', branch_id: 'b-sherouk', name: 'Creme Caramel', source_item_id: 'out-creme-shrouk', quantity: 0, cost_per_unit: 10 },
    ],
    menuItems: [],
    recipes: [
      {
        id: 'rec-creme-shrouk',
        branch_id: 'b-shrouk',
        name: 'Creme Caramel',
        output_item_id: 'out-creme-sherouk',
        output_item_name: 'Creme Caramel',
        ingredients: [{ inventory_item_id: 'sterno-sherouk', inventory_item_name: 'استيرنو', quantity_needed: 1 }],
      },
      {
        id: 'rec-legacy-1',
        branch_id: 'b-shrouk',
        name: 'Kofta Meshweya — Catering Batch',
        output_item_id: 'deleted-seed-out-1',
        output_item_name: 'Kofta Mix (Beef & Lamb)',
        ingredients: [{ inventory_item_id: 'deleted-seed-ing-1', inventory_item_name: 'Kofta Mix (Beef & Lamb)', quantity_needed: 5 }],
      },
    ],
    productionOrders: [],
    purchaseOrders: [],
    purchaseInvoices: [
      {
        id: 'pi-sherouk-1',
        invoice_number: 'INV-1001',
        branch_id: 'b-sherouk',
        status: 'posted',
        items: [
          {
            inventory_item_id: 'sterno-shrouk',
            inventory_item_name: 'استيرنو',
            quantity: 12,
            purchase_price: 25,
            total_cost: 300,
          },
        ],
      },
    ],
    financeJournals: [
      {
        id: 'jnl-sherouk-1',
        branch_id: 'b-sherouk',
        source_id: 'pi-sherouk-1',
        source_summary: {
          source_snapshot: {
            items: [{ inventory_item_id: 'sterno-shrouk', inventory_item_name: 'استيرنو', quantity: 12 }],
          },
          mapping_bindings: [{ key: 'RAW_INV_ACCOUNT', inventory_item_id: 'sterno-shrouk' }],
        },
      },
    ],
    requisitions: [],
    requisitionLines: [],
    cateringReservations: [],
    cateringEquipment: [],
    cateringVehicles: [],
    employees: [{ id: 'emp-shrouk-1', branch_id: 'b-shrouk', name: 'Ahmed' }],
    shifts: [{ id: 'shift-1', branch_id: 'b-sherouk', employee_id: 'emp-shrouk-1' }],
  };

  const diag = buildBranchIsolationDiagnosis(fixture);

  assert.equal(diag.unresolved_legacy_recipes.length, 1);
  assert.equal(diag.unresolved_legacy_recipes[0].number, 1);
  assert.equal(diag.unresolved_legacy_recipes[0].name, 'Kofta Meshweya — Catering Batch');
  assert.equal(diag.plans.recipeRepairs.length, 1);
  assert.equal(diag.plans.recipeRepairs[0].new_output_item_id, 'out-creme-shrouk');
  assert.equal(diag.plans.piRepairs.length, 1);
  assert.equal(diag.plans.piRepairs[0].stock_adjustments[0].wrong_after_qty, 66);
  assert.equal(diag.plans.piRepairs[0].stock_adjustments[0].target_after_qty, 12);
  assert.equal(diag.plans.journalRepairs.length, 1);
  assert.equal(diag.summary.intentional_cross_branch_total, 1);

  const svc = {
    entities: {
      Recipe: {
        update: async (id, patch) => {
          const idx = fixture.recipes.findIndex((r) => r.id === id);
          fixture.recipes[idx] = { ...fixture.recipes[idx], ...patch };
          return fixture.recipes[idx];
        },
      },
      PurchaseOrder: { update: async () => {} },
      PurchaseInvoice: {
        update: async (id, patch) => {
          const idx = fixture.purchaseInvoices.findIndex((p) => p.id === id);
          fixture.purchaseInvoices[idx] = { ...fixture.purchaseInvoices[idx], ...patch };
          return fixture.purchaseInvoices[idx];
        },
      },
      InventoryItem: {
        update: async (id, patch) => {
          const idx = fixture.inventoryItems.findIndex((i) => i.id === id);
          fixture.inventoryItems[idx] = { ...fixture.inventoryItems[idx], ...patch };
          return fixture.inventoryItems[idx];
        },
      },
      FinanceJournal: {
        update: async (id, patch) => {
          const idx = fixture.financeJournals.findIndex((j) => j.id === id);
          fixture.financeJournals[idx] = { ...fixture.financeJournals[idx], ...patch };
          return fixture.financeJournals[idx];
        },
      },
    },
  };

  const res1 = await executeApprovedBranchRepairs(svc, {
    selectedCategories: ['manufacturing_recipes_relink', 'purchasing_and_finance_reconciliation'],
    diagnosis: diag,
    userEmail: 'admin@rosemary.com',
  });

  assert.equal(res1.counts.recipes_relinked, 1);
  assert.equal(res1.counts.purchase_invoices_relinked, 1);
  assert.equal(res1.counts.stock_items_adjusted, 2);
  assert.equal(res1.counts.journals_relinked, 1);

  const legacyAfter = fixture.recipes.find((r) => r.id === 'rec-legacy-1');
  assert.equal(legacyAfter.output_item_id, 'deleted-seed-out-1');

  const diag2 = buildBranchIsolationDiagnosis(fixture);
  assert.equal(diag2.plans.recipeRepairs.length, 0);
  assert.equal(diag2.plans.piRepairs.length, 0);
  assert.equal(diag2.plans.journalRepairs.length, 0);
});

test('copies equipment and vehicles to target branch without duplicating existing names', async () => {
  const equipmentStore = [
    { id: 'eq-1', name: 'Folding Chair', category: 'Furniture', tracking_mode: 'bulk', total_quantity: 100, home_branch_id: 'b-shrouk', is_active: true },
  ];
  const vehicleStore = [
    { id: 'veh-1', name: 'Van 1', vehicle_type: 'van', status: 'available', home_branch_id: 'b-shrouk' },
  ];

  const svc = {
    entities: {
      CateringEquipment: {
        list: async () => equipmentStore,
        create: async (row) => {
          const created = { ...row, id: `eq-${equipmentStore.length + 1}` };
          equipmentStore.push(created);
          return created;
        },
      },
      CateringEquipmentUnit: {
        list: async () => [],
        bulkCreate: async () => [],
      },
      CateringVehicle: {
        list: async () => vehicleStore,
        create: async (row) => {
          const created = { ...row, id: `veh-${vehicleStore.length + 1}` };
          vehicleStore.push(created);
          return created;
        },
      },
    },
  };

  const firstCopy = await copyBranchEquipmentAndVehicles(svc, {
    sourceBranch: BRANCHES[0],
    targetBranch: BRANCHES[1],
    assetTypes: ['equipment', 'vehicles'],
  });
  assert.equal(firstCopy.copied_equipment_count, 1);
  assert.equal(firstCopy.copied_vehicles_count, 1);

  const secondCopy = await copyBranchEquipmentAndVehicles(svc, {
    sourceBranch: BRANCHES[0],
    targetBranch: BRANCHES[1],
    assetTypes: ['equipment', 'vehicles'],
  });
  assert.equal(secondCopy.copied_equipment_count, 0);
  assert.equal(secondCopy.skipped_equipment_count, 1);
  assert.equal(secondCopy.copied_vehicles_count, 0);
  assert.equal(secondCopy.skipped_vehicles_count, 1);
});
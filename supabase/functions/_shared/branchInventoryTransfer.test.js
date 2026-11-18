import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBranchInventoryMatcher,
  buildBranchTransferPlan,
  validateRecipeBranchIsolation,
  executeBranchInventoryTransfer,
} from './branchInventoryTransfer.js';

const shrouk = { id: 'branch-shrouk', name: 'Shrouk' };
const sherouk = { id: 'branch-sherouk', name: 'Sherouk' };

test('codes active Shrouk item definitions in Sherouk with 0 stock while leaving Shrouk items untouched', () => {
  const inventoryItems = [
    {
      id: 'inv-sugar',
      name: 'سكر',
      category_id: 'cat-grocery',
      category_name: 'البقاله',
      branch_id: shrouk.id,
      branch_name: shrouk.name,
      quantity: 25,
      unit: 'kg',
      cost_per_unit: 38,
      supplier_id: 'sup-1',
      supplier: 'El Doha',
      storage_location_id: 'loc-shrouk-main',
      storage_location_name: 'Main Storage',
      is_active: true,
    },
    {
      id: 'inv-inactive',
      name: 'Old Spice',
      category_id: 'cat-spices',
      branch_id: shrouk.id,
      branch_name: shrouk.name,
      quantity: 0,
      is_active: false,
    },
  ];

  const storageLocations = [
    { id: 'loc-shrouk-main', name: 'Main Storage', branch_id: shrouk.id, branch_name: shrouk.name },
    { id: 'loc-sherouk-main', name: 'Main Storage', branch_id: sherouk.id, branch_name: sherouk.name },
  ];

  const menuItems = [
    {
      id: 'menu-1',
      name: 'Creme Caramel',
      branch_id: null,
      recipe: [
        {
          inventory_item_id: 'inv-sugar',
          inventory_item_name: 'سكر',
          category_id: 'cat-grocery',
          quantity_needed: 13,
          unit: 'g',
        },
      ],
    },
  ];

  const plan = buildBranchTransferPlan({
    sourceBranch: shrouk,
    targetBranch: sherouk,
    inventoryItems,
    storageLocations,
    menuItems,
    recipes: [],
  });

  assert.equal(plan.summary.itemsToCopyCount, 1);
  assert.equal(plan.itemsToCopy[0].sourceItem.id, 'inv-sugar');
  assert.equal(plan.itemsToCopy[0].sourceItem.quantity, 25); // source item stock unchanged
  assert.equal(plan.itemsToCopy[0].createPayload.branch_id, sherouk.id);
  assert.equal(plan.itemsToCopy[0].createPayload.branch_name, sherouk.name);
  assert.equal(plan.itemsToCopy[0].createPayload.quantity, 0); // new destination copy has 0 stock
  assert.equal(plan.itemsToCopy[0].createPayload.source_item_id, 'inv-sugar');
  assert.equal(plan.itemsToCopy[0].createPayload.supplier_id, 'sup-1');
  assert.equal(plan.itemsToCopy[0].createPayload.storage_location_id, 'loc-sherouk-main');
  assert.equal(plan.itemsToCopy[0].createPayload.storage_location_name, 'Main Storage');
  assert.equal(plan.summary.affectedMenuItemsCount, 1);
  assert.equal(plan.summary.relinkedIngredientsCount, 1);
  assert.equal(plan.summary.unresolvedIngredientsCount, 0);
});

test('reuses existing Sherouk inventory items without duplicating and relinks recipe ingredient IDs', () => {
  const inventoryItems = [
    {
      id: 'inv-shrouk-milk',
      name: 'لبن',
      category_id: 'cat-dairy',
      branch_id: shrouk.id,
      branch_name: shrouk.name,
      quantity: 10,
      is_active: true,
    },
    {
      id: 'inv-sherouk-milk',
      name: 'لبن',
      category_id: 'cat-dairy',
      branch_id: sherouk.id,
      branch_name: sherouk.name,
      quantity: 40,
      is_active: true,
    },
  ];

  const menuItems = [
    {
      id: 'menu-om-ali',
      name: 'Om Ali',
      branch_id: sherouk.id,
      branch_name: sherouk.name,
      recipe: [
        {
          inventory_item_id: 'inv-shrouk-milk',
          inventory_item_name: 'لبن',
          category_id: 'cat-dairy',
          quantity_needed: 40,
          unit: 'ml',
        },
      ],
    },
    {
      id: 'menu-shrouk-only',
      name: 'Shrouk Special',
      branch_id: shrouk.id,
      branch_name: shrouk.name,
      recipe: [
        {
          inventory_item_id: 'inv-shrouk-milk',
          inventory_item_name: 'لبن',
          category_id: 'cat-dairy',
          quantity_needed: 20,
          unit: 'ml',
        },
      ],
    },
  ];

  const plan = buildBranchTransferPlan({
    sourceBranch: shrouk,
    targetBranch: sherouk,
    inventoryItems,
    storageLocations: [],
    menuItems,
    recipes: [],
  });

  // Shrouk milk is not copied because Sherouk already has an unambiguous match
  assert.equal(plan.summary.itemsToCopyCount, 0);
  assert.equal(plan.summary.itemsAlreadyInTargetCount, 1);
  assert.equal(plan.itemsAlreadyInTarget[0].targetItem.id, 'inv-sherouk-milk');

  // Om Ali in Sherouk is relinked to inv-sherouk-milk, while Shrouk Special is preserved untouched
  assert.equal(plan.menuUpdates.length, 1);
  assert.equal(plan.menuUpdates[0].menu_item_id, 'menu-om-ali');
  assert.equal(plan.menuUpdates[0].needsRecordWrite, true);
  assert.equal(plan.menuUpdates[0].nextRecipe[0].inventory_item_id, 'inv-sherouk-milk');
  assert.equal(plan.summary.preservedSourceMenuItemsCount, 1);
});

test('resolves duplicate-named items by category and surfaces ambiguous or missing matches for review', () => {
  const sheroukItems = [
    { id: 'ginger-veg', name: 'جنزبيل فريش', category_id: 'cat-veg', branch_id: sherouk.id },
    { id: 'ginger-spice', name: 'جنزبيل فريش', category_id: 'cat-spice', branch_id: sherouk.id },
  ];

  const matcher = buildBranchInventoryMatcher(sheroukItems);

  // With category_id, resolves unambiguously
  const vegMatch = matcher.resolve({ name: 'جنزبيل فريش', category_id: 'cat-veg' });
  assert.equal(vegMatch.status, 'matched');
  assert.equal(vegMatch.item.id, 'ginger-veg');

  // Without category_id, surfaces as ambiguous rather than guessing
  const ambMatch = matcher.resolve({ name: 'جنزبيل فريش', category_id: '' });
  assert.equal(ambMatch.status, 'ambiguous');
  assert.equal(ambMatch.candidates.length, 2);
});

test('enforces branch isolation validation when saving menu recipes', () => {
  const invById = new Map([
    ['inv-shrouk-1', { id: 'inv-shrouk-1', name: 'سكر', branch_id: shrouk.id, branch_name: shrouk.name }],
    ['inv-sherouk-1', { id: 'inv-sherouk-1', name: 'سكر', branch_id: sherouk.id, branch_name: sherouk.name }],
  ]);

  const invalid = validateRecipeBranchIsolation(
    [{ inventory_item_id: 'inv-shrouk-1', inventory_item_name: 'سكر', quantity_needed: 10 }],
    invById,
    sherouk.id,
    sherouk.name
  );
  assert.equal(invalid.ok, false);
  assert.equal(invalid.violations.length, 1);
  assert.match(invalid.violations[0].reason, /Shrouk/);

  const valid = validateRecipeBranchIsolation(
    [{ inventory_item_id: 'inv-sherouk-1', inventory_item_name: 'سكر', quantity_needed: 10 }],
    invById,
    sherouk.id,
    sherouk.name
  );
  assert.equal(valid.ok, true);
  assert.equal(valid.violations.length, 0);
});

test('executeBranchInventoryTransfer creates zero-stock copies in Sherouk, leaves Shrouk untouched, and links recipes to the new Sherouk IDs', async () => {
  const createdInv = [];
  const updatedInv = [];
  const updatedMenus = [];
  const createdRecipes = [];

  const svc = {
    entities: {
      Branch: {
        get: async (id) => (id === shrouk.id ? shrouk : id === sherouk.id ? sherouk : null),
      },
      InventoryItem: {
        list: async () => [
          {
            id: 'inv-1',
            name: 'دقيق',
            category_id: 'cat-1',
            branch_id: shrouk.id,
            branch_name: shrouk.name,
            quantity: 75,
            storage_location_id: 'loc-src',
            storage_location_name: 'Main Storage',
            is_active: true,
          },
        ],
        bulkCreate: async (batch) => {
          const withIds = batch.map((item, idx) => ({ ...item, id: `new-sherouk-${idx + 1}` }));
          createdInv.push(...withIds);
          return withIds;
        },
        bulkUpdate: async (batch) => {
          updatedInv.push(...batch);
        },
      },
      StorageLocation: {
        list: async () => [
          { id: 'loc-src', name: 'Main Storage', branch_id: shrouk.id },
          { id: 'loc-dst', name: 'Main Storage', branch_id: sherouk.id },
        ],
      },
      MenuItem: {
        list: async () => [
          {
            id: 'menu-1',
            name: 'Pancake',
            branch_id: sherouk.id,
            recipe: [{ inventory_item_id: 'inv-1', inventory_item_name: '', category_id: '', quantity_needed: 50, unit: 'g' }],
          },
        ],
        update: async (id, patch) => {
          updatedMenus.push({ id, patch });
        },
      },
      Recipe: {
        list: async () => [
          {
            id: 'rec-1',
            name: 'Pancake',
            menu_item_id: 'menu-1',
            recipe_source: 'menu_item',
            branch_id: shrouk.id,
            branch_name: shrouk.name,
            output_item_id: 'inv-1',
            ingredients: [{ inventory_item_id: 'inv-1', inventory_item_name: 'دقيق', quantity_needed: 50, unit: 'g' }],
          },
        ],
        bulkCreate: async (batch) => {
          createdRecipes.push(...batch);
          return batch;
        },
      },
    },
  };

  const res = await executeBranchInventoryTransfer(svc, {
    sourceBranchId: shrouk.id,
    targetBranchId: sherouk.id,
    dryRun: false,
  });

  // Never updates or moves source branch inventory items
  assert.equal(updatedInv.length, 0);

  // Creates destination copy with quantity: 0 and source_item_id pointing to source item
  assert.equal(res.copied_inventory_count, 1);
  assert.equal(createdInv.length, 1);
  assert.equal(createdInv[0].branch_id, sherouk.id);
  assert.equal(createdInv[0].quantity, 0);
  assert.equal(createdInv[0].source_item_id, 'inv-1');
  assert.equal(createdInv[0].storage_location_id, 'loc-dst');

  // Relinks menu recipe to the new Sherouk copy ID
  assert.equal(updatedMenus.length, 1);
  assert.equal(updatedMenus[0].patch.recipe[0].inventory_item_id, 'new-sherouk-1');
  assert.equal(updatedMenus[0].patch.recipe[0].inventory_item_name, 'دقيق');

  // Creates a destination recipe copy for Sherouk pointing to the new Sherouk copy ID
  assert.equal(createdRecipes.length, 1);
  assert.equal(createdRecipes[0].branch_id, sherouk.id);
  assert.equal(createdRecipes[0].output_item_id, 'new-sherouk-1');
  assert.equal(createdRecipes[0].ingredients[0].inventory_item_id, 'new-sherouk-1');
});
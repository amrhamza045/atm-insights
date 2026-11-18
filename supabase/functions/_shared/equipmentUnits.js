const codePrefix = (name) => {
  const letters = String(name || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return (letters.slice(0, 6) || 'EQUIP').padEnd(3, 'X');
};

export function buildUnitRows(equipment, count, options = {}) {
  const total = Math.max(0, Math.min(Number(count) || 0, 500));
  if (!equipment?.id || total === 0) return [];
  const prefix = codePrefix(equipment.name);
  const used = new Set((options.existingCodes || []).map((c) => String(c || '').toUpperCase()));
  const rows = [];
  let seq = 1;
  while (rows.length < total) {
    const code = `${prefix}-${String(seq).padStart(3, '0')}`;
    seq += 1;
    if (used.has(code)) continue;
    used.add(code);
    rows.push({
      equipment_id: equipment.id,
      equipment_name: equipment.name || '',
      unit_code: code,
      status: 'available',
      current_branch_id: equipment.home_branch_id || '',
      current_branch_name: equipment.home_branch_name || '',
      storage_location: equipment.storage_location || '',
      purchase_date: options.purchaseDate || equipment.purchase_date || '',
    });
  }
  return rows;
}
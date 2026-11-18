import { formatCurrency } from "@/components/utils/currencyFormatter";

export const ANIMAL_STATUS_CONFIG = {
  alive: { label: "Alive", color: "bg-green-100 text-green-700" },
  scheduled_slaughter: { label: "Scheduled for Slaughter", color: "bg-warning-100 text-warning-700" },
  slaughtered: { label: "Slaughtered", color: "bg-blue-100 text-blue-700" },
  deceased_pre_slaughter: { label: "Deceased (Pre-slaughter)", color: "bg-red-100 text-red-700" },
  rejected_returned: { label: "Rejected / Returned", color: "bg-slate-200 text-slate-700" },
};

export const BATCH_STATUS_CONFIG = {
  open: { label: "Open", color: "bg-slate-100 text-slate-700" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700" },
};

export const RAW_MATERIAL_STATUS_CONFIG = {
  in_stock: { label: "In Stock", color: "bg-green-100 text-green-700" },
  reworked: { label: "Reworked", color: "bg-warning-100 text-warning-700" },
  sold: { label: "Sold", color: "bg-blue-100 text-blue-700" },
};

export const CONDEMNATION_CONFIG = {
  none: { label: "None", color: "bg-slate-100 text-slate-600" },
  full: { label: "Full Condemnation", color: "bg-red-100 text-red-700" },
  partial: { label: "Partial Condemnation", color: "bg-warning-100 text-warning-700" },
};

export const SPECIES_OPTIONS = ["cattle", "buffalo", "sheep", "goat", "ostrich", "rabbit"];

export const SPECIES_ICONS = {
  cattle: "🐄",
  buffalo: "🐃",
  sheep: "🐏",
  goat: "🐐",
  ostrich: null,
  rabbit: "🐰",
};

export const SPECIES_IMAGES = {
  ostrich: "https://media.base44.com/images/public/69709def3c5445d198d66244/686cc6781_generated_image.png",
};

export const SPECIES_LABELS = {
  cattle: "Cattle",
  buffalo: "Buffalo",
  sheep: "Sheep",
  goat: "Goat",
  ostrich: "Ostrich",
  rabbit: "Rabbit",
};
export const SEX_OPTIONS = ["male", "female", "unknown"];
export const GRADE_OPTIONS = ["prime", "choice", "standard", "utility", "ungraded"];
export const WASTE_CATEGORIES = ["blood", "gut_contents", "hide", "bone", "fat", "offal", "condemned_tissue", "other"];
export const PRIMAL_CUTS_BY_SPECIES = {
  cattle: [
    // Primals
    "Chuck", "Rib", "Short Loin", "Sirloin", "Round", "Brisket", "Plate (Short Plate)", "Flank", "Shank (Foreshank)", "Hind Shank",
    // Sub-primals & retail cuts
    "Chuck Eye Roll", "Top Blade", "Flat Iron", "Mock Tender", "Bottom Blade", "Cross Rib", "Shoulder Clod", "Chuck Short Ribs", "Chuck Roast", "Stew Beef (Chuck)",
    "Prime Rib", "Standing Rib Roast", "Ribeye Steak", "Ribeye Roast", "Beef Back Ribs", "Short Ribs", "Spencer Roll",
    "T-Bone Steak", "Porterhouse Steak", "Striploin (New York)", "Tenderloin", "Wing Steak (Club Steak)", "Top Loin",
    "Top Sirloin Steak", "Bottom Sirloin", "Sirloin Cap", "Tri-Tip", "Ball Tip", "Peeled Knuckle",
    "Top Round (Inside Round)", "Bottom Round (Outside Round)", "Eye of Round", "Sirloin Tip (Knuckle)", "Heel of Round", "Round Roast", "Round Steak",
    "Brisket Point", "Brisket Flat", "Corned Beef",
    "Plate Short Ribs", "Outside Skirt Steak", "Inside Skirt Steak", "Hanger Steak", "Plate Flank Steak",
    "Flank Steak (London Broil)",
    "Osso Buco (Hind Shank Crosscut)", "Beef Shank Crosscut", "Shin Meat",
    "Neck", "Hanging Tender (Oyster Steak)", "Delmonico Steak", "Coulotte Steak",
  ],
  buffalo: [
    // Primals (same breakdown as cattle/bison)
    "Chuck", "Rib", "Short Loin", "Sirloin", "Round", "Brisket", "Plate", "Flank", "Foreshank", "Hind Shank",
    // Sub-primals & retail cuts
    "Chuck Eye Roll", "Top Blade", "Flat Iron", "Mock Tender", "Cross Rib", "Shoulder Clod", "Chuck Roast",
    "Prime Rib", "Standing Rib Roast", "Ribeye Steak", "Back Ribs", "Short Ribs",
    "T-Bone Steak", "Porterhouse Steak", "Striploin", "Tenderloin", "Club Steak",
    "Top Sirloin", "Bottom Sirloin", "Sirloin Cap", "Tri-Tip",
    "Top Round", "Bottom Round", "Eye of Round", "Sirloin Tip", "Round Roast", "Round Steak",
    "Brisket Point", "Brisket Flat",
    "Skirt Steak", "Hanger Steak", "Plate Short Ribs",
    "Flank Steak",
    "Osso Buco", "Shank Crosscut", "Shin Meat",
    "Neck", "Hanging Tender",
  ],
  sheep: [
    // Primals
    "Shoulder", "Rack (Rib)", "Loin", "Leg", "Breast", "Shank", "Neck", "Flank", "Saddle",
    // Sub-primals & retail cuts
    "Shoulder Roast", "Shoulder Chops", "Shoulder Blade", "Shoulder Arm", "Forequarter Rack", "Forequarter Chop", "Easy-Carve Shoulder",
    "Neck Chops", "Neck Fillet", "Neck Rosette",
    "Rack Chops", "Rack Roast", "Crown Roast", "French Rack", "Rib Chops",
    "Loin Chops", "Loin Roast", "Eye of Loin", "Tenderloin", "Saddle Roast",
    "Leg Bone-In", "Easy-Carve Leg", "Leg (Boned)", "Leg Steak", "Mini Leg Roast", "Sirloin Chops", "Sirloin Roast",
    "Hind Shank", "Foreshank", "Shank Crosscut",
    "Breast", "Breast Flap", "Lamb Belly",
    "Flank", "Riblets", "Lamb Riblets",
    "Ground Lamb", "Lamb Stew Meat",
  ],
  goat: [
    // Primals
    "Neck", "Shoulder", "Rack (Rib)", "Loin", "Leg", "Flank", "Breast", "Hindshank", "Foreshank",
    // Sub-primals & retail cuts
    "Neck Chops", "Neck Fillet", "Neck Rosette",
    "Shoulder Roast", "Shoulder Chops", "Bone-In Shoulder", "Easy-Carve Shoulder", "Forequarter Rack", "Forequarter Chop",
    "Rack Chops", "Rack Roast", "Rib Chops",
    "Loin Chops", "Loin Roast", "Eye of Loin", "Tenderloin",
    "Leg Bone-In", "Easy-Carve Leg", "Leg (Boned)", "Leg Steak", "Mini Roast", "Sirloin Chops", "Sirloin Roast",
    "Hind Shank", "Foreshank", "Drumstick", "Shank Crosscut",
    "Breast", "Breast Flap", "Goat Belly",
    "Flank", "Goat Riblets",
    "Ground Goat", "Goat Stew Meat",
  ],
  ostrich: [
    "Fan Fillet", "Small Fillet", "Tornedo Fillet", "Eye Fillet", "Tenderloin", "Whole Fan",
    "Drum Fillet", "Flat Drum", "Drum Steak", "Small Drum",
    "Rump Steak", "Tender Steak", "Small Steak", "Moon Steak", "Strip Steak", "Top Loin Steak",
    "Roast Fillet", "Roast Steak",
    "Goulash", "Mixed Cubes", "Diced Ostrich", "Trimmings", "Ground Ostrich", "Stir-Fry Strips", "Schnitzel (Escalope)",
  ],
  rabbit: [
    "Saddle (Loin)", "Rack (Shoulders & Ribs)", "Hind Legs", "Front Legs", "Belly", "Tenderloin", "Rib Cage", "Flank", "Neck",
    "Saddle Roast", "Loin Chops", "Loin Fillet", "Leg (Whole)", "Leg Fillet", "Thigh", "Drumstick",
    "Rack Roast", "Shoulder", "Ribs", "Belly Flap",
    "Ground Rabbit", "Rabbit Stew Meat", "Rabbit Sausage",
  ],
};

export function getCutsForSpecies(species) {
  return PRIMAL_CUTS_BY_SPECIES[species] || PRIMAL_CUTS_BY_SPECIES.cattle;
}

export const ALLOCATION_METHODS = [
  { value: "weight", label: "Weight-based" },
  { value: "value", label: "Value-based" },
];


export function fmtNum(n, decimals = 2) {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: 0 });
}

export function fmtMoney(n) {
  if (n == null || isNaN(n)) return formatCurrency(0);
  return formatCurrency(n);
}

export function pct(n, decimals = 1) {
  if (n == null || isNaN(n)) return "—";
  return `${Number(n).toFixed(decimals)}%`;
}

export function generateLotNumber(prefix = "LOT") {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${ymd}-${rand}`;
}

export function generateSkuNumber() {
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `SKU-${Date.now().toString().slice(-6)}-${rand}`;
}

export function generateBatchNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `PB-${ymd}-${rand}`;
}
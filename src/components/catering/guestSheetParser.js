import * as XLSX from "xlsx";

const pick = (row, keys) => {
  const entry = Object.entries(row).find(([k]) =>
    keys.some((key) => String(k).trim().toLowerCase() === key)
  );
  return entry ? String(entry[1]).trim() : "";
};

/** Reads an Excel/CSV file in the browser and returns guest rows: {name, email, phone, seats}. */
export async function parseGuestSheet(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("That file has no readable sheet.");

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  return rows
    .map((row) => ({
      name: pick(row, ["name", "guest name", "guest", "full name", "الاسم"]),
      email: pick(row, ["email", "mail", "e-mail", "email address"]),
      phone: pick(row, ["phone", "mobile", "phone number", "tel", "telephone"]),
      seats: Number(pick(row, ["seats", "party size", "guests"])) || 0,
    }))
    .filter((g) => g.name);
}
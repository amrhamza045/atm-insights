// Free OpenStreetMap place search tuned for Egypt.
// 1) Photon (komoot) — fuzzy / partial matching, biased to Cairo, Egypt-only results.
// 2) Nominatim fallback restricted to Egypt (exact-ish matching).
// Returns [{ id, label, lat, lng }].

const CAIRO = { lat: 30.0444, lon: 31.2357 };

function photonLabel(p) {
  const parts = [
    p.name,
    [p.housenumber, p.street].filter(Boolean).join(" "),
    p.district,
    p.city || p.town || p.village,
    p.state,
    p.country,
  ];
  return [...new Set(parts.filter(Boolean))].join(", ");
}

async function searchPhoton(q) {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=10&lat=${CAIRO.lat}&lon=${CAIRO.lon}&lang=en`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  return (data?.features || [])
    .filter((f) => (f.properties?.countrycode || "").toUpperCase() === "EG")
    .map((f) => ({
      id: `photon-${f.properties.osm_type}-${f.properties.osm_id}`,
      label: photonLabel(f.properties),
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
    }));
}

async function searchNominatim(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=8&countrycodes=eg&accept-language=en,ar&q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json().catch(() => []);
  return (data || []).map((r) => ({
    id: `nominatim-${r.place_id}`,
    label: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
  }));
}

export async function searchVenues(q) {
  const query = q.trim();
  if (!query) return [];
  const photon = await searchPhoton(query);
  if (photon.length) return photon;
  return searchNominatim(query);
}
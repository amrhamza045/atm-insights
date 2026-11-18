import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, ExternalLink } from "lucide-react";
import { searchVenues } from "@/components/catering/venueSearch";

export default function VenueMapPicker({ address, lat, lng, onPick }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    const q = query.trim() || address?.trim();
    if (!q) return;
    setLoading(true);
    setResults([]);
    const data = await searchVenues(q);
    setResults(data);
    setLoading(false);
  };

  const [pasted, setPasted] = useState("");
  const [pasteError, setPasteError] = useState("");

  const pinPoint = async (la, ln) => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${la}&lon=${ln}`
    );
    const data = await res.json().catch(() => null);
    onPick({ address: data?.display_name || address || `${la}, ${ln}`, lat: la, lng: ln });
    setPasted("");
  };

  const applyPasted = async () => {
    setPasteError("");
    const text = pasted.trim();
    if (!text) return;

    // 1. Precise pin coordinates inside full Google Maps links (!3d<lat>!4d<lng>)
    const marker = text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (marker) return pinPoint(Number(marker[1]), Number(marker[2]));

    // 2. Any lat,lng pair — plain coordinates, @lat,lng or ?q=lat,lng
    const pair = text.match(/(-?\d+\.\d+)[,\s/@]+(-?\d+\.\d+)/);
    if (pair) return pinPoint(Number(pair[1]), Number(pair[2]));

    // 3. Place-name links (google.com/maps/place/<Name>/ or ?q=<Name>) → search that name
    const place = text.match(/\/maps\/place\/([^/@?]+)/) || text.match(/[?&]q=([^&]+)/);
    if (place) {
      const name = decodeURIComponent(place[1].replace(/\+/g, " "));
      setQuery(name);
      setPasted("");
      const data = await searchVenues(name);
      setResults(data);
      if (!data.length) setPasteError(`Couldn't find "${name}" — try searching above with a simpler name.`);
      return;
    }

    // 4. Shortened share links (maps.app.goo.gl) carry no coordinates in the URL itself
    if (/goo\.gl|maps\.app/.test(text)) {
      setPasteError("Short share links don't contain the location. Open the link, then copy the full URL from the browser's address bar (or long-press the pin and copy the coordinates) and paste that here.");
      return;
    }

    setPasteError("Couldn't read a location from that. Paste a Google Maps link or coordinates like 30.0444, 31.2357.");
  };

  const hasPoint = lat !== "" && lat != null && lng !== "" && lng != null;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }}
          placeholder="Search a place or address on the map…"
        />
        <Button type="button" variant="outline" onClick={search} disabled={loading}>
          <Search className="w-4 h-4 mr-1" />{loading ? "Searching…" : "Search"}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex gap-2"
              onClick={() => {
                onPick({ address: r.label, lat: r.lat, lng: r.lng });
                setResults([]);
                setQuery("");
              }}
            >
              <MapPin className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
              <span>{r.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyPasted(); } }}
          placeholder="Or paste a Google Maps link / coordinates (30.0444, 31.2357)"
        />
        <Button type="button" variant="outline" onClick={applyPasted}>Pin</Button>
      </div>
      {pasteError && <p className="text-xs text-amber-700">{pasteError}</p>}
      <p className="text-xs text-slate-500">
        Tip: drop a pin in Google Maps, tap Share → Copy link, and paste it above for the exact spot.
      </p>

      {hasPoint && (
        <div className="space-y-1">
          <iframe
            title="Venue location"
            className="w-full h-56 rounded-lg border"
            loading="lazy"
            src={`https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
          />
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 inline-flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" /> Open in Google Maps ({Number(lat).toFixed(5)}, {Number(lng).toFixed(5)})
          </a>
        </div>
      )}
    </div>
  );
}
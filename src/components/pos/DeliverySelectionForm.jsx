import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function DeliverySelectionForm({
  isProEnabled, setIsProEnabled,
  selectedDeliveryCompany, setSelectedDeliveryCompany,
  selectedDeliveryZone, setSelectedDeliveryZone,
  selectedDeliveryPerson, setSelectedDeliveryPerson,
  deliveryCompanies, deliveryZones, deliveryPersons,
  selectedDeliveryAddress, setSelectedDeliveryAddress,
  customerAddresses,
  isDelivery,
  disabled
}) {
  return (
    <div className="space-y-3 pb-3 border-b">
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-600" />
          <span className="font-semibold text-sm">Pro (Free Delivery)</span>
        </div>
        <button
          disabled={disabled}
          onClick={() => setIsProEnabled(!isProEnabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isProEnabled ? 'bg-amber-500' : 'bg-slate-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isProEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Delivery Company*</p>
        <select
          value={selectedDeliveryCompany?.id || ""}
          onChange={(e) => {
            const company = deliveryCompanies.find(c => c.id === e.target.value);
            setSelectedDeliveryCompany(company || null);
          }}
          disabled={disabled}
          className="w-full p-2 border rounded-lg text-sm bg-white disabled:opacity-50"
        >
          <option value="">Select company...</option>
          {deliveryCompanies.map(company => (
            <option key={company.id} value={company.id}>{company.name}</option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Delivery Zone*</p>
        <select
          value={selectedDeliveryZone?.id || ""}
          onChange={(e) => {
            const zone = deliveryZones.find(z => z.id === e.target.value);
            setSelectedDeliveryZone(zone || null);
          }}
          disabled={disabled}
          className="w-full p-2 border rounded-lg text-sm bg-white disabled:opacity-50"
        >
          <option value="">Select zone...</option>
          {deliveryZones.map(zone => {
            const fee = selectedDeliveryCompany && zone.company_specific_fees?.[selectedDeliveryCompany.id]
              ? zone.company_specific_fees[selectedDeliveryCompany.id]
              : zone.delivery_fee;
            return (
              <option key={zone.id} value={zone.id}>
                {zone.name} - {formatCurrency(fee)} {zone.estimated_time ? `(${zone.estimated_time} mins)` : ''}
              </option>
            );
          })}
        </select>
      </div>

      {isDelivery && selectedDeliveryAddress && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs space-y-1">
          <p className="font-semibold text-blue-800">📍 {selectedDeliveryAddress.address_name}</p>
          <p className="text-blue-700">{selectedDeliveryAddress.street_address}</p>
          {selectedDeliveryAddress.area && <p className="text-blue-600">{selectedDeliveryAddress.area}{selectedDeliveryAddress.city ? `, ${selectedDeliveryAddress.city}` : ''}</p>}
          {selectedDeliveryAddress.building && <p className="text-blue-600">Bldg: {selectedDeliveryAddress.building}{selectedDeliveryAddress.floor ? ` Fl.${selectedDeliveryAddress.floor}` : ''}{selectedDeliveryAddress.apartment ? ` Apt ${selectedDeliveryAddress.apartment}` : ''}</p>}
          {customerAddresses.length > 1 && (
            <select className="mt-1 w-full border rounded p-1 bg-white text-blue-800" value={selectedDeliveryAddress.id} onChange={(e) => setSelectedDeliveryAddress(customerAddresses.find(a => a.id === e.target.value))}>
              {customerAddresses.map(a => <option key={a.id} value={a.id}>{a.address_name} - {a.street_address}</option>)}
            </select>
          )}
        </div>
      )}

      {selectedDeliveryZone && !['Talabat', 'Hurry Up', 'Rabbit'].some(tp => selectedDeliveryCompany?.name?.includes(tp)) && (
        <div>
          <p className="text-sm font-medium mb-2">Assign Delivery Person*</p>
          <div className="space-y-2">
            {deliveryPersons.map(person => (
              <button
                key={person.id}
                disabled={disabled}
                onClick={() => setSelectedDeliveryPerson(person)}
                className={`w-full text-left p-2 rounded-lg border transition-colors ${
                  selectedDeliveryPerson?.id === person.id ? "bg-blue-50 border-blue-500" : "border-slate-200 hover:bg-slate-50"
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{person.name}</p>
                    <p className="text-xs text-slate-500">{person.phone}</p>
                  </div>
                  <Badge className={person.status === "active" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
                    {person.status}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
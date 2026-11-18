import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Package, CheckCircle2, Truck, User, MapPin, Phone, Navigation, ExternalLink, UserPlus } from "lucide-react";
import moment from "moment";

const statusConfig = {
  pending: { label: "Pending", cls: "bg-warning-100 text-warning-700 border-warning-200" },
  acknowledged: { label: "Acknowledged", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  in_delivery: { label: "In Delivery", cls: "bg-purple-100 text-purple-700 border-purple-200" },
  delivered: { label: "Delivered", cls: "bg-green-100 text-green-700 border-green-200" },
  failed: { label: "Failed", cls: "bg-red-100 text-red-700 border-red-200" },
};

export default function DeliveryOrderCard({ order, onStatusChange, onAssign, onSelfAssign, deliveryPersons, currentUser, selected, onSelect }) {
  const status = order.delivery_status || "pending";
  const config = statusConfig[status] || statusConfig.pending;
  const shortId = order.id?.slice(-6).toUpperCase();
  const [showAssign, setShowAssign] = useState(false);

  // Build address string
  const addr = order.delivery_address || {};
  const addressParts = [
    addr.street_address,
    addr.building && `Bldg ${addr.building}`,
    addr.floor && `Floor ${addr.floor}`,
    addr.apartment && `Apt ${addr.apartment}`,
    addr.area,
    addr.city,
  ].filter(Boolean);
  const addressStr = addressParts.join(", ") || addr.street || "No address";
  const phone = order.customer_phone || addr.phone;
  const locationUrl = addr.location_url;

  return (
    <div
      className={`border rounded-lg p-3 bg-white cursor-pointer transition-all ${selected ? "ring-2 ring-warning-400 border-warning-400" : "border-slate-200 hover:border-slate-300"}`}
      onClick={() => onSelect?.(order)}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-sm text-slate-900">#{shortId}</p>
          <p className="text-xs font-medium text-slate-700">{order.customer_name || "Walk-in"}</p>
        </div>
        <Badge variant="outline" className={config.cls}>{config.label}</Badge>
      </div>

      <div className="space-y-1 text-xs text-slate-600">
        {phone && (
          <p className="flex items-center gap-1">
            <Phone className="w-3 h-3 shrink-0 text-blue-500" />
            <a href={`tel:${phone}`} onClick={e => e.stopPropagation()} className="hover:underline">{phone}</a>
          </p>
        )}
        <p className="flex items-start gap-1">
          <MapPin className="w-3 h-3 shrink-0 mt-0.5 text-red-500" />
          <span className="leading-tight">{addressStr}</span>
        </p>
        {locationUrl && (
          <a href={locationUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-blue-600 hover:underline">
            <Navigation className="w-3 h-3 shrink-0" />View Location on Map
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
        {order.delivery_company_name && (
          <p className="flex items-center gap-1"><Truck className="w-3 h-3 shrink-0" />{order.delivery_company_name}</p>
        )}
        <p className="flex items-center gap-1">
          <User className="w-3 h-3 shrink-0" />
          {order.delivery_person_name ? order.delivery_person_name : <span className="text-warning-600 font-medium">Unassigned</span>}
        </p>
        <p className="flex items-center gap-1"><Package className="w-3 h-3 shrink-0" />{order.items?.length || 0} items · EGP {(order.total || 0).toFixed(2)}</p>
        <p className="flex items-center gap-1"><Clock className="w-3 h-3 shrink-0" />{moment(order.created_date).format("MMM DD, HH:mm")}</p>
      </div>

      <div className="mt-2 flex gap-2" onClick={e => e.stopPropagation()}>
        {/* Self-assign button for delivery persons */}
        {!order.delivery_person_id && status !== "delivered" && onSelfAssign && (
          <Button size="sm" variant="outline" className="h-7 text-xs flex-1 border-green-300 text-green-700 hover:bg-green-50" onClick={() => onSelfAssign(order)}>
            <UserPlus className="w-3 h-3 mr-1" />Assign to Me
          </Button>
        )}
        {/* Admin assignment dropdown */}
        {!order.delivery_person_id && status !== "delivered" && !onSelfAssign && (
          <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => setShowAssign(!showAssign)}>
            <UserPlus className="w-3 h-3 mr-1" />Assign
          </Button>
        )}
        {order.delivery_person_id && status !== "delivered" && (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAssign(!showAssign)}>
            Reassign
          </Button>
        )}

        {showAssign && (
          <div className="flex gap-1 flex-1">
            <Select
              value={order.delivery_person_id || ""}
              onValueChange={(val) => {
                onAssign(order, val);
                setShowAssign(false);
              }}
            >
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue placeholder="Select person" />
              </SelectTrigger>
              <SelectContent>
                {deliveryPersons?.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Status change buttons */}
        {status === "pending" && (
          <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => onStatusChange(order, "acknowledged")}>
            Acknowledge
          </Button>
        )}
        {status === "acknowledged" && (
          <Button size="sm" className="h-7 text-xs bg-purple-600 hover:bg-purple-700" onClick={() => onStatusChange(order, "in_delivery")}>
            Start Delivery
          </Button>
        )}
        {status === "in_delivery" && (
          <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => onStatusChange(order, "delivered")}>
            <CheckCircle2 className="w-3 h-3 mr-1" />Delivered
          </Button>
        )}
      </div>
    </div>
  );
}
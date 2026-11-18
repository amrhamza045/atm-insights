import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function PrinterSelectDialog({ open, onClose, printers, onSelectPrinter }) {
  const [selectedPrinterId, setSelectedPrinterId] = useState(null);
  const [printerType, setPrinterType] = useState("cashier");

  const handleConfirm = () => {
    const printer = printers.find(p => p.id === selectedPrinterId);
    if (printer) {
      onSelectPrinter(printer, printerType);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Printer & Type</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2 p-2 bg-slate-50 rounded-lg">
            <Button
              variant={printerType === "cashier" ? "default" : "outline"}
              size="sm"
              onClick={() => setPrinterType("cashier")}
              className="flex-1"
            >
              Cashier Receipt
            </Button>
            <Button
              variant={printerType === "kitchen" ? "default" : "outline"}
              size="sm"
              onClick={() => setPrinterType("kitchen")}
              className="flex-1"
            >
              Kitchen Prep
            </Button>
            <Button
              variant={printerType === "bar" ? "default" : "outline"}
              size="sm"
              onClick={() => setPrinterType("bar")}
              className="flex-1"
            >
              Bar Prep
            </Button>
          </div>
          {printers.map((printer) => (
            <button
              key={printer.id}
              onClick={() => setSelectedPrinterId(printer.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedPrinterId === printer.id
                  ? "bg-blue-50 border-blue-500"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Printer className="w-5 h-5 text-slate-600" />
                <div>
                  <p className="font-medium">{printer.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{printer.type} Printer</p>
                </div>
              </div>
            </button>
          ))}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleConfirm} disabled={!selectedPrinterId} className="flex-1">
              Print
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
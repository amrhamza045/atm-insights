import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Full-screen popup used for customer and supplier account details.
export default function AccountDetailOverlay({ open, title, onClose, children }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[95vh] w-[96vw] max-w-[96vw] flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="border-b px-6 py-4 text-left">
          <DialogTitle dir="auto" className="text-xl">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mx-auto max-w-6xl">{children}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, ScanLine, Save, Loader2, Camera, CheckCircle2, QrCode, UserPlus, UserCheck, Crop, CreditCard } from "lucide-react";
import { toast } from "sonner";
import ManualQrCropper from "@/components/pos/ManualQrCropper";
import { uploadPrivateReceipt, resolveFileLink } from "@/lib/privateFiles";

export default function TalabatReceiptUploader({ selectedBranch, selectedBranchId, onDataExtracted, deliveryCompanyName = "Talabat" }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [manualCropOpen, setManualCropOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receiptPhotoUrl, setReceiptPhotoUrl] = useState("");
  const [receiptPhotoRef, setReceiptPhotoRef] = useState("");
  const [extractedData, setExtractedData] = useState(null);
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState("");
  const [qrDecodedText, setQrDecodedText] = useState("");
  const [clientStatus, setClientStatus] = useState(null); // { action: 'created'|'updated'|'found', client_id, client_name }
  const [scannedPaymentMethod, setScannedPaymentMethod] = useState(null); // 'cash' | 'credit_card' | 'unknown'
  const [editable, setEditable] = useState({
    client_name: "",
    mobile_number: "",
    customer_address: "",
    address_qr_code: ""
  });
  const fileInputRef = useRef(null);

  const resetState = () => {
    setReceiptPhotoUrl("");
    setReceiptPhotoRef("");
    setExtractedData(null);
    setQrCodeImageUrl("");
    setQrDecodedText("");
    setClientStatus(null);
    setScannedPaymentMethod(null);
    setEditable({ client_name: "", mobile_number: "", customer_address: "", address_qr_code: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // QR code cropping is handled by the shared utility in qrCodeCropper.jsx
  // Key insight: the QR code on Talabat receipts is located BETWEEN the client's
  // mobile number and the client's delivery address. The shared utility uses the
  // AI's contextual bounding box to constrain BarcodeDetector results, preventing
  // it from picking up QR codes outside the receipt (background, walls, etc.).

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      // Step 1: Upload the receipt photo
      // Receipts show customer name/phone/address — store privately and use a
      // short-lived link for the preview, AI read and QR cropper.
      const photoRef = await uploadPrivateReceipt(file);
      const photoUrl = await resolveFileLink(photoRef, 3600);
      setReceiptPhotoRef(photoRef);
      setReceiptPhotoUrl(photoUrl);
      setUploading(false);

      // Step 2: Extract data using AI vision
      setExtracting(true);
      const llmResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert at reading food delivery receipts from photos (Talabat, Hurry Up, Elmenus, Noon Food, etc.). Carefully examine the attached receipt image and extract the following fields:

1. **client_name**: The customer's full name ONLY. This field must contain ONLY the person's name (letters and spaces) — NO phone numbers, NO digits. If the name and phone number appear on the same line or are close together, extract ONLY the name portion into this field.
2. **mobile_number**: The customer's mobile/phone number ONLY. This field must contain ONLY digits, the + sign, spaces, and dashes — NO names, NO letters. Extract ONLY the phone number into this field.
3. **customer_address**: The full delivery address text as printed on the receipt (building, street, area, city, floor, apartment, landmarks, etc.).
4. **address_qr_code**: If there is a QR code visible on the receipt, try to decode it. If you can read the content, return it. If you cannot decode it, return "QR_DETECTED_NOT_DECODED". If no QR code is visible at all, return "NO_QR_CODE".
5. **qr_present**: Set to true if a QR code is visible on the receipt.
6. **qr_bounding_box**: If a QR code is visible, estimate its location as percentage-based coordinates of the IMAGE dimensions (not the receipt paper — the entire photo):
   - x_pct: left edge of the QR code as a percentage of image width (0-100)
   - y_pct: top edge of the QR code as a percentage of image height (0-100)
   - width_pct: width of the QR code as a percentage of image width (0-100)
   - height_pct: height of the QR code as a percentage of image height (0-100)
   If no QR code, set all to 0.
7. **payment_method**: The payment method shown on the receipt. Look for keywords like "Cash", "Credit Card", "Visa", "Mastercard", "Paid Online", "Knet", etc. Return ONLY one of these exact values: "cash" or "credit_card". If the receipt shows cash payment, return "cash". If it shows credit card / visa / mastercard / online payment, return "credit_card". If unclear, return "unknown".

IMPORTANT LAYOUT HINT: On delivery receipts, the QR code is usually located BETWEEN the client's mobile number and the client's delivery address. Look for the QR code in that vertical region of the receipt — it is a square barcode pattern. Do NOT report bounding boxes for QR codes that appear outside the receipt paper (e.g., in the background of the photo, on walls, screens, or other papers). Only report the QR code that is printed on the receipt itself.

Return ONLY the JSON object with these fields. If a text field is not found, return an empty string.`,
        file_urls: [photoUrl],
        response_json_schema: {
          type: "object",
          properties: {
            client_name: { type: "string" },
            mobile_number: { type: "string" },
            customer_address: { type: "string" },
            address_qr_code: { type: "string" },
            qr_present: { type: "boolean" },
            qr_bounding_box: {
              type: "object",
              properties: {
                x_pct: { type: "number" },
                y_pct: { type: "number" },
                width_pct: { type: "number" },
                height_pct: { type: "number" }
              }
            },
            payment_method: { type: "string" }
          }
        }
      });

      const data = typeof llmResponse === "string" ? JSON.parse(llmResponse) : llmResponse;
      setExtractedData(data);
      setScannedPaymentMethod(data.payment_method || "unknown");
      setEditable({
        client_name: data.client_name || "",
        mobile_number: data.mobile_number || "",
        customer_address: data.customer_address || "",
        address_qr_code: data.address_qr_code === "QR_DETECTED_NOT_DECODED" ? "" : (data.address_qr_code || "")
      });
      setExtracting(false);

      // Step 3: Preview client status (actual create/update happens on save with edited values)
      const mobile = (data.mobile_number || "").trim();
      const previewName = (data.client_name || "").trim();
      if (mobile) {
        try {
          const existingClients = await base44.entities.Client.filter({ phone: mobile });
          if (existingClients[0]) {
            setClientStatus({ action: "found", client_id: existingClients[0].id, client_name: existingClients[0].name });
          } else {
            setClientStatus({ action: "will_create", client_name: previewName || "Talabat Customer" });
          }
        } catch (e) {
          console.error("Client lookup error:", e);
          setClientStatus({ action: "will_create", client_name: previewName || "Talabat Customer" });
        }
      } else if (previewName) {
        try {
          const existingByName = await base44.entities.Client.filter({ name: previewName });
          if (existingByName[0]) {
            setClientStatus({ action: "found", client_id: existingByName[0].id, client_name: existingByName[0].name });
          } else {
            setClientStatus({ action: "will_create", client_name: previewName });
          }
        } catch (e) {
          setClientStatus({ action: "will_create", client_name: previewName });
        }
      } else {
        setClientStatus({ action: "will_create", client_name: "Talabat Customer" });
      }

      toast.success("Receipt data extracted successfully");
    } catch (error) {
      console.error("Talabat receipt processing error:", error);
      toast.error("Failed to process receipt: " + (error.message || "Unknown error"));
      setUploading(false);
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Create or update client using the user-verified edited values
      const mobile = (editable.mobile_number || "").trim();
      const clientName = (editable.client_name || "").trim() || "Talabat Customer";
      let clientId = clientStatus?.client_id || null;

      const svcClient = base44.entities.Client;
      if (mobile) {
        try {
          const existingClients = await svcClient.filter({ phone: mobile });
          const existing = existingClients[0];
          if (existing) {
            const updates = {};
            if (!existing.name && clientName) updates.name = clientName;
            if (!existing.phone && mobile) updates.phone = mobile;
            if (Object.keys(updates).length > 0) {
              await svcClient.update(existing.id, updates);
            }
            clientId = existing.id;
            setClientStatus({ action: "found", client_id: existing.id, client_name: existing.name || clientName });
          } else {
            const newClient = await svcClient.create({
              name: clientName,
              phone: mobile,
              status: "active",
              loyalty_program_enrolled: false
            });
            clientId = newClient.id;
            setClientStatus({ action: "created", client_id: newClient.id, client_name: newClient.name });
            toast.success(`New customer created: ${newClient.name}`);
          }
        } catch (clientErr) {
          console.error("Client create/update error:", clientErr);
          toast.warning("Could not create/update customer record");
        }
      } else {
        // No mobile — try matching by name to avoid duplicates, otherwise create new
        try {
          const existingByName = clientName && clientName !== "Talabat Customer"
            ? await svcClient.filter({ name: clientName })
            : [];
          const existing = existingByName[0];
          if (existing) {
            clientId = existing.id;
            setClientStatus({ action: "found", client_id: existing.id, client_name: existing.name });
          } else {
            const newClient = await svcClient.create({
              name: clientName,
              status: "active",
              loyalty_program_enrolled: false
            });
            clientId = newClient.id;
            setClientStatus({ action: "created", client_id: newClient.id, client_name: newClient.name });
            toast.success(`New customer created: ${newClient.name}`);
          }
        } catch (clientErr) {
          console.error("Client create error:", clientErr);
          toast.warning("Could not create customer record");
        }
      }

      const record = await base44.entities.TalabatReceipt.create({
        branch_id: selectedBranchId || null,
        branch_name: selectedBranch?.name || null,
        client_id: clientId,
        client_name: editable.client_name,
        mobile_number: editable.mobile_number,
        customer_address: editable.customer_address,
        address_qr_code: qrDecodedText || editable.address_qr_code || null,
        qr_code_image_url: qrCodeImageUrl || null,
        raw_extraction: extractedData ? JSON.stringify(extractedData) : null,
        status: "processed"
      });

      // Create / update an Address record at the CLIENT level so the
      // delivery address + QR image are stored on the client profile
      // (not just on the order snapshot)
      let createdAddressId = null;
      if (clientId && editable.customer_address) {
        try {
          const existingAddresses = await base44.entities.Address.filter({
            client_id: clientId
          });
          const addressPayload = {
            client_id: clientId,
            address_name: "Talabat Delivery",
            street_address: editable.customer_address,
            phone: editable.mobile_number || null,
            location_url: qrDecodedText || editable.address_qr_code || null,
            qr_code_image_url: qrCodeImageUrl || null,
            is_default: existingAddresses.length === 0
          };
          const newAddress = await base44.entities.Address.create(addressPayload);
          createdAddressId = newAddress.id;
        } catch (addrErr) {
          console.error("Address create error:", addrErr);
        }
      }

      // Notify parent POS component — include address_id so the order
      // links to the client-level Address record
      if (onDataExtracted) {
        onDataExtracted({
          ...editable,
          address_qr_code: qrDecodedText || editable.address_qr_code,
          qr_code_image_url: qrCodeImageUrl,
          client_id: clientId,
          client_name: clientStatus?.client_name || editable.client_name,
          receipt_id: record.id,
          address_id: createdAddressId,
          receipt_photo_url: receiptPhotoRef,
          scanned_payment_method: scannedPaymentMethod || "unknown"
        });
      }

      toast.success("Talabat receipt data saved to database");
      setSaving(false);
      setOpen(false);
      resetState();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save receipt data: " + (error.message || "Unknown error"));
      setSaving(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    resetState();
  };

  const isProcessing = uploading || extracting;
  const processingLabel = uploading ? "Uploading photo..." : extracting ? "Reading receipt with AI..." : "";

  const handleManualCropComplete = (result) => {
    if (!result) return;
    setQrCodeImageUrl(result.file_url);
    if (result.qr_content) {
      setQrDecodedText(result.qr_content);
      setEditable((prev) => ({ ...prev, address_qr_code: result.qr_content }));
    }
    setManualCropOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50">
          <ScanLine className="w-4 h-4" />
          Scan {deliveryCompanyName} Receipt
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-orange-600" />
            {deliveryCompanyName} Receipt Scanner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Section */}
          {!receiptPhotoUrl && (
            <Card>
              <CardContent className="pt-6">
                <div
                  onClick={() => !isProcessing && fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-3 py-8 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                      <p className="text-sm font-medium text-slate-600">{processingLabel}</p>
                    </>
                  ) : (
                    <>
                      <Camera className="w-10 h-10 text-slate-400" />
                      <p className="text-sm font-medium text-slate-600">Click to upload {deliveryCompanyName} receipt photo</p>
                      <p className="text-xs text-slate-400">PNG, JPG up to 10MB</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={isProcessing}
                />
              </CardContent>
            </Card>
          )}

          {/* Receipt Preview + Extracted Data */}
          {receiptPhotoUrl && (
            <div className="space-y-3">
              {/* Receipt image preview */}
              <div className="relative">
                <img
                  src={receiptPhotoUrl}
                  alt="Talabat Receipt"
                  className="w-full max-h-48 object-contain rounded-lg border border-slate-200 bg-slate-50"
                />
                {!isProcessing && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-3 h-3 mr-1" /> Replace
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={isProcessing}
                />
              </div>

              {/* Processing indicator */}
              {isProcessing && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                  <p className="text-sm text-slate-600">{processingLabel}</p>
                </div>
              )}

              {/* QR Code Image Section — manual positioning */}
              {!isProcessing && extractedData && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <QrCode className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <p className="text-sm font-medium text-blue-900">QR Code Image</p>
                  </div>
                  {qrCodeImageUrl ? (
                    <div className="flex items-start gap-3">
                      <img
                        src={qrCodeImageUrl}
                        alt="Extracted QR Code"
                        className="w-28 h-28 object-contain bg-white border border-blue-200 rounded"
                      />
                      <div className="flex-1 space-y-2">
                        <p className="text-xs text-blue-600">Saved QR image for receipt printing</p>
                        {qrDecodedText && (
                          <p className="text-xs text-slate-600 break-all">
                            <span className="font-medium">Decoded:</span> {qrDecodedText}
                          </p>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => setManualCropOpen(true)}
                        >
                          <Crop className="w-3.5 h-3.5" /> Re-position
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-blue-600">
                        Position the QR code manually: drag the receipt to center the QR inside the square crop box.
                      </p>
                      <Button
                        variant="default"
                        size="sm"
                        className="gap-1 bg-blue-600 hover:bg-blue-700"
                        onClick={() => setManualCropOpen(true)}
                      >
                        <Crop className="w-3.5 h-3.5" /> Position QR Code
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Scanned Payment Method Badge */}
              {scannedPaymentMethod && !isProcessing && (
                <div className={`flex items-center gap-2 p-3 border rounded-lg ${
                  scannedPaymentMethod === "cash"
                    ? "bg-green-50 border-green-200"
                    : scannedPaymentMethod === "credit_card"
                    ? "bg-purple-50 border-purple-200"
                    : "bg-amber-50 border-amber-200"
                }`}>
                  <CreditCard className={`w-5 h-5 flex-shrink-0 ${
                    scannedPaymentMethod === "cash"
                      ? "text-green-600"
                      : scannedPaymentMethod === "credit_card"
                      ? "text-purple-600"
                      : "text-amber-600"
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Receipt Payment Method: <span className={
                        scannedPaymentMethod === "cash"
                          ? "text-green-700"
                          : scannedPaymentMethod === "credit_card"
                          ? "text-purple-700"
                          : "text-amber-700"
                      }>{scannedPaymentMethod === "cash" ? "CASH" : scannedPaymentMethod === "credit_card" ? "CREDIT CARD" : "UNKNOWN"}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {scannedPaymentMethod === "cash"
                        ? "POS payment method must be set to: CL"
                        : scannedPaymentMethod === "credit_card"
                        ? "POS payment method must be set to: Hospitality"
                        : "Could not detect payment method — please verify manually"}
                    </p>
                  </div>
                </div>
              )}

              {/* Client Status Badge */}
              {clientStatus && !isProcessing && (
                <div className={`flex items-center gap-2 p-3 border rounded-lg ${
                  clientStatus.action === "found"
                    ? "bg-green-50 border-green-200"
                    : "bg-blue-50 border-blue-200"
                }`}>
                  {clientStatus.action === "found" ? (
                    <UserCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <UserPlus className={`w-5 h-5 flex-shrink-0 ${
                      clientStatus.action === "found" ? "text-green-600" : "text-blue-600"
                    }`} />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${
                      clientStatus.action === "found" ? "text-green-900" : "text-blue-900"
                    }`}>
                      {clientStatus.action === "found" ? "Existing customer found" :
                       clientStatus.action === "created" ? "New customer created" :
                       clientStatus.action === "updated" ? "Customer information updated" :
                       "New customer will be created on save"}
                    </p>
                    <p className={`text-xs ${
                      clientStatus.action === "found" ? "text-green-600" : "text-blue-600"
                    }`}>{clientStatus.client_name}</p>
                  </div>
                </div>
              )}

              {/* Extracted Data Form */}
              {extractedData && !isProcessing && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <p className="text-sm font-medium">Data extracted — review and edit before saving</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium text-slate-600">Client Name</Label>
                      <Input
                        value={editable.client_name}
                        onChange={(e) => setEditable({ ...editable, client_name: e.target.value })}
                        placeholder="Customer name"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-600">Mobile Number</Label>
                      <Input
                        value={editable.mobile_number}
                        onChange={(e) => setEditable({ ...editable, mobile_number: e.target.value })}
                        placeholder="Customer mobile number"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-600">Customer Address</Label>
                      <Input
                        value={editable.customer_address}
                        onChange={(e) => setEditable({ ...editable, customer_address: e.target.value })}
                        placeholder="Delivery address"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-600">Address QR Code Content</Label>
                      <Input
                        value={qrDecodedText || editable.address_qr_code}
                        onChange={(e) => {
                          setQrDecodedText(e.target.value);
                          setEditable({ ...editable, address_qr_code: e.target.value });
                        }}
                        placeholder="QR code decoded content (if available)"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!extractedData || saving || isProcessing}
            className="gap-2 bg-orange-600 hover:bg-orange-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save to Database
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Manual QR code positioning dialog */}
      <ManualQrCropper
        imageUrl={receiptPhotoUrl}
        open={manualCropOpen}
        onClose={() => setManualCropOpen(false)}
        onCropComplete={handleManualCropComplete}
      />
    </Dialog>
  );
}
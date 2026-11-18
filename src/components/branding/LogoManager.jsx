import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_LOGO =
  "https://media.base44.com/images/public/69709def3c5445d198d66244/80119c3cb_image.png";

export default function LogoManager({ logoUrl, onLogoChange, title = "Site logo (light background)", hint = "Shown in the app's top navigation bar. Falls back to the default logo if none is set.", fallback = DEFAULT_LOGO, previewClass = "bg-slate-50" }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onLogoChange(file_url);
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error("Upload failed", { description: err.message });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const previewSrc = logoUrl || fallback;

  return (
    <Card className="p-6 border-0 shadow-sm">
      <div className="flex items-start gap-4">
        <div className={`w-24 h-24 rounded-xl ${previewClass} border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0`}>
          <img
            src={previewSrc}
            alt="Logo preview"
            className="w-full h-full object-contain p-2"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-slate-500" />
            {title}
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">{hint}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploading ? "Uploading..." : logoUrl ? "Replace" : "Upload"}
            </Button>
            {logoUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => onLogoChange("")}
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </Button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>
    </Card>
  );
}
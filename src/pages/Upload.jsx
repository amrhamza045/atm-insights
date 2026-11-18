import { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { motion } from "framer-motion";
import { CheckCircle, ArrowRight, Upload as UploadIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "../utils";
import FileUploader from "../components/upload/FileUploader";
import { toast } from "sonner";
import * as XLSX from "xlsx";

function getFieldValue(row, aliases) {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const normalizedAlias = alias.toLowerCase().replace(/[\s_-]+/g, '');
    for (const key of keys) {
      const normalizedKey = key.toLowerCase().replace(/[\s_-]+/g, '');
      if (normalizedKey === normalizedAlias) {
        return row[key];
      }
    }
  }
  return '';
}

function parseDateValue(val) {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val)) return val.toISOString();
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch (e) {
    // fallback
  }
  return null;
}

export default function Upload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [errorDetails, setErrorDetails] = useState(null);
  const navigate = useNavigate();
  
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

  const handleFileSelect = async (file) => {
    setIsUploading(true);
    setUploadSuccess(false);
    setErrorDetails(null);

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      setErrorDetails({
        message: "File size exceeds limit",
        details: `File size: ${(file.size / 1024 / 1024).toFixed(2)}MB, Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`
      });
      setIsUploading(false);
      return;
    }

    try {
      // 1. Read file in browser via SheetJS
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (!rawRows || rawRows.length === 0) {
        throw new Error("No data found in the spreadsheet. Please verify the file contains rows.");
      }

      // 2. Normalize rows to the ATMLog schema
      const uploadBatchId = new Date().toISOString();
      const normalizedData = rawRows
        .map((row) => {
          const terminalId = String(getFieldValue(row, ['terminal_id', 'terminal id', 'terminal', 'atm id', 'atmid', 'atm']) || '').trim();
          return {
            terminal_id: terminalId,
            module_name: String(getFieldValue(row, ['module_name', 'module name', 'module']) || '').trim(),
            event: String(getFieldValue(row, ['event']) || '').trim(),
            fault_type: String(getFieldValue(row, ['fault_type', 'fault type', 'fault']) || '').trim(),
            branch: String(getFieldValue(row, ['branch', 'location', 'site']) || '').trim(),
            vendor: String(getFieldValue(row, ['vendor', 'supplier', 'provider']) || '').trim(),
            type: String(getFieldValue(row, ['type', 'category']) || '').trim(),
            rule: String(getFieldValue(row, ['rule']) || '').trim(),
            last_processing_step: String(getFieldValue(row, ['last_processing_step', 'last processing step', 'status', 'step']) || '').trim(),
            starting_from: parseDateValue(getFieldValue(row, ['starting_from', 'starting from', 'start time', 'start date', 'start'])),
            ending_at: parseDateValue(getFieldValue(row, ['ending_at', 'ending at', 'end time', 'end date', 'end'])),
            duration: String(getFieldValue(row, ['duration']) || '').trim(),
            solved_by: String(getFieldValue(row, ['solved_by', 'solved by', 'technician', 'engineer']) || '').trim(),
            maintenance_remark: String(getFieldValue(row, ['maintenance_remark', 'maintenance remark', 'remark', 'remarks', 'notes', 'comment']) || '').trim(),
            upload_batch_id: uploadBatchId,
          };
        })
        .filter((row) => row.terminal_id !== ""); // Keep rows that have at least a terminal ID

      if (normalizedData.length === 0) {
        throw new Error("Could not extract any rows with a valid Terminal ID. Check your column headers.");
      }

      // 3. Insert into Supabase
      const { error: insertError } = await supabase
        .from('atm_logs')
        .insert(normalizedData);

      if (insertError) {
        throw insertError;
      }

      setUploadedCount(normalizedData.length);
      setUploadSuccess(true);
      toast.success(`Successfully imported ${normalizedData.length} logs`);
    } catch (error) {
      console.error("Upload error:", error);
      const errorMsg = error.message || "Upload failed";
      toast.error(errorMsg);
      setErrorDetails({
        message: "Upload error occurred",
        details: error.message || error.toString(),
        stack: error.stack,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-2xl mb-6"
          >
            <UploadIcon className="w-8 h-8 text-indigo-600" />
          </motion.div>
          
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-3">
            Upload ATM Logs
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Import your ATM maintenance logs from Excel or CSV files for instant analysis
          </p>
        </div>

        {/* Upload Component */}
        <FileUploader
          onFileSelect={handleFileSelect}
          isUploading={isUploading}
          uploadSuccess={uploadSuccess}
        />

        {/* Success State */}
        {uploadSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-8 border border-emerald-100"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              
              <h3 className="text-2xl font-semibold text-slate-900 mb-2">
                Upload Complete!
              </h3>
              <p className="text-slate-600 mb-6">
                Successfully imported <span className="font-semibold text-emerald-600">{uploadedCount}</span> logs
              </p>
              
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => navigate(createPageUrl('Dashboard'))}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  View Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(createPageUrl('Logs'))}
                >
                  View All Logs
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {errorDetails && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 bg-red-50 rounded-2xl p-8 border border-red-200"
          >
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  {errorDetails.message}
                </h3>
                <p className="text-sm text-red-700 mb-4">
                  {errorDetails.details}
                </p>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setErrorDetails(null)}
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Instructions */}
        <div className="mt-12 bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Expected Excel Columns
          </h3>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-xl p-4">
              <div>• Terminal ID (Required)</div>
              <div>• Module Name</div>
              <div>• Event</div>
              <div>• Fault Type</div>
              <div>• Branch</div>
              <div>• Vendor</div>
              <div>• Type</div>
              <div>• Rule</div>
              <div>• Last Processing Step</div>
              <div>• Starting From</div>
              <div>• Ending At</div>
              <div>• Duration</div>
              <div>• Solved By</div>
              <div>• Maintenance Remark</div>
            </div>
            <div className="mt-4 text-xs text-slate-500">
              <strong>File size limit:</strong> Maximum {MAX_FILE_SIZE / 1024 / 1024}MB per upload • Supports .xlsx, .xls, .csv
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { Upload, X, Download, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ImportResult {
  created: number;
  failed: { row: number; errors: string[] }[];
  total: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export default function ImportCsvDialog({ open, onClose, onImported }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  function reset() {
    setResult(null);
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFile(file: File) {
    if (!/\.(csv|txt)$/i.test(file.name)) {
      toast.error("Please upload a .csv file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large (max 5MB)");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const text = await file.text();
      const res = await fetch("/api/leads/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Import failed");
        setLoading(false);
        return;
      }
      setResult(data);
      if (data.created > 0) {
        toast.success(`Imported ${data.created} lead${data.created === 1 ? "" : "s"}`);
        onImported();
      } else if (data.failed?.length > 0) {
        toast.error("No leads imported — see errors below");
      }
    } catch {
      toast.error("Failed to read file");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Import Leads from CSV</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-700 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!result && (
            <>
              <div className="text-sm text-gray-600 leading-relaxed">
                Upload a CSV with one lead per row. Required: any of{" "}
                <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">displayName</code>,{" "}
                <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">companyName</code>,{" "}
                <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">email</code>, or{" "}
                <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">phone</code>.
              </div>

              <a
                href="/api/leads/csv-template"
                className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition"
              >
                <Download className="w-4 h-4" /> Download template
              </a>

              <div
                onClick={() => !loading && fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (loading) return;
                  const file = e.dataTransfer.files[0];
                  if (file) handleFile(file);
                }}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
                  loading
                    ? "border-indigo-300 bg-indigo-50/40 cursor-wait"
                    : "border-gray-300 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-8 h-8 text-indigo-500 mx-auto animate-spin mb-2" />
                    <p className="text-sm font-medium text-gray-600">Importing leads...</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-gray-700">
                      Drop CSV here or click to upload
                    </p>
                    <p className="text-xs text-gray-400 mt-1">UTF-8 CSV, max 5MB</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>
            </>
          )}

          {result && (
            <div className="space-y-3">
              {result.created > 0 && (
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-green-900">
                      {result.created} lead{result.created === 1 ? "" : "s"} imported
                    </p>
                    <p className="text-xs text-green-700">out of {result.total} rows</p>
                  </div>
                </div>
              )}

              {result.failed.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="font-bold text-red-900">
                      {result.failed.length} row{result.failed.length === 1 ? "" : "s"} failed
                    </p>
                  </div>
                  <ul className="text-xs text-red-700 space-y-1.5 max-h-48 overflow-y-auto">
                    {result.failed.map((f, i) => (
                      <li key={i}>
                        <span className="font-bold">Row {f.row}:</span> {f.errors.join("; ")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={reset}
                  className="flex-1 px-4 py-2.5 text-sm font-bold border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition"
                >
                  Import another
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-xl transition hover:opacity-90"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

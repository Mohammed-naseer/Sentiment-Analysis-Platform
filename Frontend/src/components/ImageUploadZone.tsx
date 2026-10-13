import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ImageUploadZoneProps {
  onImageSelected: (file: File | null, previewUrl: string | null) => void;
  disabled?: boolean;
}

export function ImageUploadZone({ onImageSelected, disabled }: ImageUploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (file: File) => {
    setError(null);
    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validMimes.includes(file.type.toLowerCase())) {
      setError("Please select a valid image file (JPEG, PNG, or WEBP).");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError("Image file size exceeds the 15 MB limit.");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    onImageSelected(file, objectUrl);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    onImageSelected(null, null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-primary" />
          Product Photo / Visual Evidence (Optional)
        </span>
        {selectedFile && (
          <span className="text-success flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </span>
        )}
      </div>

      <AnimatePresence>
        {preview ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="relative rounded-xl overflow-hidden border border-border bg-card/60 p-3 flex items-center gap-4"
          >
            <div className="w-20 h-20 rounded-lg overflow-hidden border border-border/80 bg-background flex-shrink-0">
              <img src={preview} alt="Upload preview" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{selectedFile?.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ready for combined multimodal defect & sentiment analysis
              </p>
            </div>
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-border/80 hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleChange}
              disabled={disabled}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">
                  Click or drag and drop product image
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  JPEG, PNG, or WEBP up to 15MB
                </p>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

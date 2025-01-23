import React from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, Image, X, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onDrop: (files: File[]) => void;
  uploadState: 'idle' | 'uploading' | 'success' | 'error';
  selectedFile: File | null;
  isDragActive: boolean;
}

export const UploadZone = ({ onDrop, uploadState, selectedFile, isDragActive }: UploadZoneProps) => {
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    multiple: false,
  });

  const getFileIcon = () => {
    if (!selectedFile) return <Upload className="w-12 h-12 text-gray-400" />;
    if (selectedFile.type === 'application/pdf') {
      return <File className="w-12 h-12 text-medical-bright" />;
    }
    return <Image className="w-12 h-12 text-medical-bright" />;
  };

  return (
    <div
      {...getRootProps()}
      className={cn(
        "w-full p-8 border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer",
        "hover:border-medical-sky hover:bg-medical-soft/10",
        isDragActive ? "border-medical-bright bg-medical-soft/20" : "border-gray-300",
        uploadState === 'error' && "border-red-500 bg-red-50",
        uploadState === 'success' && "border-green-500 bg-green-50",
        "animate-fade-in"
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center space-y-4">
        {uploadState === 'uploading' ? (
          <Loader2 className="w-12 h-12 text-medical-bright animate-spin" />
        ) : uploadState === 'success' ? (
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        ) : uploadState === 'error' ? (
          <X className="w-12 h-12 text-red-500" />
        ) : (
          getFileIcon()
        )}

        <div className="text-center">
          {selectedFile ? (
            <>
              <p className="text-lg font-medium text-gray-700">
                {selectedFile.name}
              </p>
              <p className="text-sm text-gray-500">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-700">
                Drop your file here
              </p>
              <p className="text-sm text-gray-500">
                Accepts PDF, JPEG, and PNG files (max 5MB)
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
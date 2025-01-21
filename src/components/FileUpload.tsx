import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export const FileUpload = ({ onFileSelect }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log("File dropped:", acceptedFiles[0].name);
    const file = acceptedFiles[0];
    setSelectedFile(file);
    onFileSelect(file);
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "w-full p-8 border-2 border-dashed rounded-lg transition-colors duration-200 cursor-pointer",
        "hover:border-medical-sky hover:bg-medical-soft/10",
        isDragActive ? "border-medical-bright bg-medical-soft/20" : "border-gray-300",
        "animate-fade-in"
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center space-y-4">
        {selectedFile ? (
          <>
            <File className="w-12 h-12 text-medical-bright" />
            <p className="text-gray-600">{selectedFile.name}</p>
          </>
        ) : (
          <>
            <Upload className="w-12 h-12 text-gray-400" />
            <div className="text-center">
              <p className="text-lg font-medium text-gray-700">
                Drop your prescription PDF here
              </p>
              <p className="text-sm text-gray-500">
                or click to select a file
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
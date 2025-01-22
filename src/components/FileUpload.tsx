import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, X, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  onUploadSuccess: (fileId: string) => void;
  onReset: () => void;
}

export const FileUpload = ({ onFileSelect, onUploadSuccess, onReset }: FileUploadProps) => {
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const validateFile = (file: File) => {
    console.log("Validating file:", file.name);
    if (file.type !== 'application/pdf') {
      setErrorMessage("Only PDF files are allowed");
      return false;
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB
      setErrorMessage("Maximum file size is 10MB");
      return false;
    }
    return true;
  };

  const uploadFile = async (file: File) => {
    try {
      console.log("Starting file upload:", file.name);
      setUploadState('uploading');
      setUploadProgress(0);

      // Create a unique file path
      const fileExt = file.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('temp_pdfs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      console.log("File uploaded successfully, creating database record");

      // Create database record
      const { data: fileRecord, error: dbError } = await supabase
        .from('uploaded_files')
        .insert({
          filename: file.name,
          file_path: filePath,
          content_type: file.type,
          size: file.size
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setUploadState('success');
      setUploadProgress(100);
      onUploadSuccess(fileRecord.id);
      toast({
        title: "Upload Successful",
        description: "Your file has been uploaded successfully.",
      });
    } catch (error) {
      console.error("Upload error:", error);
      setUploadState('error');
      setErrorMessage("Upload failed, please try again");
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your file.",
        variant: "destructive",
      });
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log("File dropped:", acceptedFiles[0]?.name);
    const file = acceptedFiles[0];
    if (!file) return;

    setErrorMessage("");
    if (!validateFile(file)) {
      setUploadState('error');
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
    await uploadFile(file);
  }, [onFileSelect, onUploadSuccess]);

  const handleReset = () => {
    setSelectedFile(null);
    setUploadState('idle');
    setErrorMessage("");
    setUploadProgress(0);
    onFileSelect(null);
    onReset();
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: false,
  });

  return (
    <div className="space-y-4">
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
          ) : selectedFile ? (
            <File className="w-12 h-12 text-medical-bright" />
          ) : (
            <Upload className="w-12 h-12 text-gray-400" />
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
                  Drop your prescription PDF here
                </p>
                <p className="text-sm text-gray-500">
                  or click to select a file
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {uploadState === 'uploading' && (
        <div className="w-full space-y-2">
          <Progress value={uploadProgress} className="w-full" />
          <p className="text-sm text-center text-gray-500">
            Uploading... {uploadProgress}%
          </p>
        </div>
      )}

      {errorMessage && (
        <p className="text-sm text-red-500 text-center animate-fade-in">
          {errorMessage}
        </p>
      )}

      {(uploadState === 'success' || uploadState === 'error') && (
        <button
          onClick={handleReset}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors mx-auto block"
        >
          Reset
        </button>
      )}
    </div>
  );
};
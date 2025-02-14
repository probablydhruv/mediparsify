import React, { useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { UploadZone } from "./UploadZone";
import { validateFile } from "@/utils/fileUtils";

export interface FileUploadProps {
  onUploadSuccess: (file: File | null) => void;
}

export const FileUpload = ({ onUploadSuccess }: FileUploadProps) => {
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const handleUpload = async (file: File) => {
    try {
      setUploadState('uploading');
      setUploadProgress(0);
      setUploadState('success');
      setUploadProgress(100);
      onUploadSuccess(file);
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
    const file = acceptedFiles[0];
    if (!file) return;

    setErrorMessage("");
    const validation = validateFile(file);
    if (!validation.isValid) {
      setErrorMessage(validation.error || "Invalid file");
      setUploadState('error');
      return;
    }
    setSelectedFile(file);
    await handleUpload(file);
  }, [onUploadSuccess]);

  const handleReset = () => {
    setSelectedFile(null);
    setUploadState('idle');
    setErrorMessage("");
    setUploadProgress(0);
  };

  return (
    <div className="space-y-4">
      <UploadZone
        onDrop={onDrop}
        uploadState={uploadState}
        selectedFile={selectedFile}
      />

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
        <></>
        // <button
        //   onClick={handleReset}
        //   className="text-sm text-gray-500 hover:text-gray-700 transition-colors mx-auto block"
        // >
        //   Reset
        // </button>
      )}
    </div>
  );
};
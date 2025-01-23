import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const [fileId, setFileId] = useState<string>("");
  const [fileUrl, setFileUrl] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const { toast } = useToast();

  const handleFileSelect = (file: File | null) => {
    console.log("File selected:", file?.name);
    setSelectedFile(file);
    setFileUrl("");
  };

  const handleUploadSuccess = (id: string) => {
    console.log("Upload completed successfully with ID:", id);
    setIsUploaded(true);
    setFileId(id);
  };

  const handleReset = () => {
    console.log("Resetting form");
    setSelectedFile(null);
    setIsUploaded(false);
    setFileId("");
    setFileUrl("");
  };

  const handleProcess = async () => {
    if (!fileId) {
      toast({
        title: "Error",
        description: "No file selected for processing",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    console.log("Processing file ID:", fileId);

    try {
      const { data: fileData } = await supabase
        .from('uploaded_files')
        .select('*')
        .eq('id', fileId)
        .single();

      if (fileData) {
        const { data } = supabase.storage
          .from('temp_pdfs')
          .getPublicUrl(fileData.file_path);

        setFileUrl(data.publicUrl);
        toast({
          title: "Success!",
          description: "File URL generated successfully.",
        });
      }
    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: "Processing Failed",
        description: "Failed to process the file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            PDF File Upload
          </h1>
          <p className="text-gray-600">
            Upload your PDF file to store it securely
          </p>
        </div>

        <div className="space-y-4">
          <Select
            value={selectedLanguage}
            onValueChange={setSelectedLanguage}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="de">German</SelectItem>
            </SelectContent>
          </Select>

          <FileUpload 
            onFileSelect={handleFileSelect}
            onUploadSuccess={handleUploadSuccess}
            onReset={handleReset}
          />
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleProcess}
            disabled={!isUploaded || isProcessing}
            className="w-full bg-medical-bright hover:bg-medical-sky text-white transition-colors"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing File...
              </>
            ) : isUploaded ? (
              "Get File URL"
            ) : (
              "Upload File"
            )}
          </Button>

          {fileUrl && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">File URL:</h3>
              <a 
                href={fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 break-all"
              >
                {fileUrl}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
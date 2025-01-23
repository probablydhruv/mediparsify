import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const [extractedText, setExtractedText] = useState<string>("");
  const [fileId, setFileId] = useState<string>("");
  const { toast } = useToast();

  const handleFileSelect = (file: File | null) => {
    console.log("File selected:", file?.name);
    setSelectedFile(file);
    setExtractedText("");
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
    setExtractedText("");
    setFileId("");
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
      const { data, error } = await supabase.functions.invoke('extract-text', {
        body: { fileId }
      });

      if (error) throw error;

      console.log("Text extraction successful");
      setExtractedText(data.text);
      
      toast({
        title: "Success!",
        description: "Text extracted successfully.",
      });
    } catch (error) {
      console.error("Text extraction error:", error);
      toast({
        title: "Processing Failed",
        description: "Failed to extract text from the document. Please try again.",
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
            Medical Report Parser
          </h1>
          <p className="text-gray-600">
            Upload your prescription to extract the text
          </p>
        </div>

        <FileUpload 
          onFileSelect={handleFileSelect}
          onUploadSuccess={handleUploadSuccess}
          onReset={handleReset}
        />

        <div className="space-y-4">
          <Button
            onClick={handleProcess}
            disabled={!isUploaded || isProcessing}
            className="w-full bg-medical-bright hover:bg-medical-sky text-white transition-colors"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Extracting Text...
              </>
            ) : isUploaded ? (
              "Process Report"
            ) : (
              "Upload Report"
            )}
          </Button>
        </div>

        {extractedText && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Extracted Text (Testing Only):</h3>
            <pre className="whitespace-pre-wrap text-sm text-gray-700">
              {extractedText}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
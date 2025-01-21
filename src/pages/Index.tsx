import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { LanguageSelect } from "@/components/LanguageSelect";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (file: File | null) => {
    console.log("File selected:", file?.name);
    setSelectedFile(file);
  };

  const handleUploadSuccess = () => {
    console.log("Upload completed successfully");
    setIsUploaded(true);
  };

  const handleReset = () => {
    console.log("Resetting form");
    setSelectedFile(null);
    setIsUploaded(false);
    setSelectedLanguage("");
  };

  const handleLanguageSelect = (language: string) => {
    console.log("Language selected:", language);
    setSelectedLanguage(language);
  };

  const handleProcess = async () => {
    if (!selectedFile || !selectedLanguage) {
      toast({
        title: "Missing Information",
        description: "Please select both a file and language before processing.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    console.log("Processing file:", selectedFile.name, "in language:", selectedLanguage);

    try {
      // Simulating processing time
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      toast({
        title: "Success!",
        description: "Your prescription has been processed successfully.",
      });
    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: "Processing Failed",
        description: "There was an error processing your prescription. Please try again.",
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
            Upload your prescription and select your preferred language
          </p>
        </div>

        <FileUpload 
          onFileSelect={handleFileSelect}
          onUploadSuccess={handleUploadSuccess}
          onReset={handleReset}
        />

        <div className="space-y-4">
          <LanguageSelect 
            onLanguageSelect={handleLanguageSelect}
          />

          <Button
            onClick={handleProcess}
            disabled={!isUploaded || !selectedLanguage || isProcessing}
            className="w-full bg-medical-bright hover:bg-medical-sky text-white transition-colors"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : isUploaded ? (
              "Analyze Report"
            ) : (
              "Upload Report"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { useToast } from "@/hooks/use-toast";
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
  const [isUploaded, setIsUploaded] = useState(false);
  const [fileId, setFileId] = useState<string>("");
  const [fileUrl, setFileUrl] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [extractedText, setExtractedText] = useState<string>("");
  const { toast } = useToast();

  const handleFileSelect = (file: File | null) => {
    console.log("File selected:", file?.name);
    setSelectedFile(file);
    setFileUrl("");
    setExtractedText("");
  };

  const handleUploadSuccess = async (id: string) => {
    console.log("Upload completed successfully with ID:", id);
    setIsUploaded(true);
    setFileId(id);
    
    try {
      // Get the file data to send to the edge function
      const { data: fileData, error: fileError } = await supabase
        .from('uploaded_files')
        .select('*')
        .eq('id', id)
        .single();

      if (fileError) {
        console.error("Error fetching file data:", fileError);
        throw fileError;
      }

      console.log("Retrieved file data:", fileData);

      if (fileData) {
        const { data: storageData } = supabase.storage
          .from('temp_pdfs')
          .getPublicUrl(fileData.file_path);

        console.log("Generated public URL:", storageData.publicUrl);
        setFileUrl(storageData.publicUrl);

        // Download the file to send to the edge function
        console.log("Downloading file from URL:", storageData.publicUrl);
        const fileResponse = await fetch(storageData.publicUrl);
        if (!fileResponse.ok) {
          throw new Error(`Failed to download file: ${fileResponse.statusText}`);
        }
        const fileBlob = await fileResponse.blob();

        // Create FormData with the file
        const formData = new FormData();
        formData.append('file', fileBlob, fileData.filename);
        formData.append('language', selectedLanguage);

        console.log("Calling extract-text function with FormData:", {
          filename: fileData.filename,
          size: fileBlob.size,
          type: fileBlob.type,
          language: selectedLanguage
        });

        const { data: extractResponse, error: functionError } = await supabase.functions.invoke('extract-text', {
          body: formData,
        });

        if (functionError) {
          console.error("Edge function error:", functionError);
          throw functionError;
        }

        console.log("Extract text response:", extractResponse);
        if (extractResponse?.extractedText) {
          setExtractedText(extractResponse.extractedText);
          toast({
            title: "Success!",
            description: "Text extracted successfully.",
          });
        } else {
          throw new Error("No extracted text in response");
        }
      }
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to process the file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    console.log("Resetting form");
    setSelectedFile(null);
    setIsUploaded(false);
    setFileId("");
    setFileUrl("");
    setExtractedText("");
  };

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            MediParsify
          </h1>
          <h2 className="text-xl md:text-xl text-gray-900">
            MediScanner of the future
          </h2>
          <p className="text-gray-600">
            Upload your Report file to extract text in the language of your choice.
          </p>
        </div>

        <div className="space-y-4">
          <FileUpload 
            onFileSelect={handleFileSelect}
            onUploadSuccess={handleUploadSuccess}
            onReset={handleReset}
          />
        </div>

        {fileUrl && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
            <div>
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

            {extractedText && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Extracted Text:</h3>
                  <Select
                    value={selectedLanguage}
                    onValueChange={setSelectedLanguage}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select Language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-white p-4 rounded-md border border-gray-200">
                  <pre className="whitespace-pre-wrap font-mono text-sm">
                    {extractedText}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
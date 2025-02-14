import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Markdown from 'react-markdown';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Component(){
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [extractedText, setExtractedText] = useState<string>("");
  const { toast } = useToast();

  const handleUploadSuccess = async (file: File) => {

    try {
      const fileData = file;
      if (!file) {
        console.error("Error fetching file data");
      }
      else {
        const fileBlob = new Blob([file]);
        const formData = new FormData();
        formData.append('file', fileBlob, fileData.name);
        formData.append('language', selectedLanguage);
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

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            TOMO Health
          </h1>
          <p className="text-gray-600">
            Upload your Report file to extract text in the language of your choice.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg">Select language for summary:</h3>
            <Select
              value={selectedLanguage}
              onValueChange={setSelectedLanguage}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Language" />
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Hindi">Hindi</SelectItem>
                  <SelectItem value="Bengali">Bengali</SelectItem>
                  <SelectItem value="Marathi">Marathi</SelectItem>
                  <SelectItem value="Telugu">Telugu</SelectItem>
                  <SelectItem value="Tamil">Tamil</SelectItem>
                  <SelectItem value="Gujarati">Gujarati</SelectItem>
                  <SelectItem value="Kannada">Kannada</SelectItem>
                  <SelectItem value="Idia">Odia</SelectItem>
                  <SelectItem value="Malyalam">Malayalam</SelectItem>
                  <SelectItem value="Punjabi">Punjabi</SelectItem>
                  <SelectItem value="Assamese">Assamese</SelectItem>
                </SelectContent>
              </SelectTrigger>
            </Select>
          </div>
          <FileUpload
            onUploadSuccess={handleUploadSuccess}
          />
        </div>

        {extractedText && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-md border border-gray-200">
              <pre className="whitespace-pre-wrap font-mono text-sm">
                <Markdown>{extractedText}</Markdown>
              </pre>
            </div>
          </div>
        )}
      </div >
    </div >
  );
};

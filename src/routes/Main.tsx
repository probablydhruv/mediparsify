import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { useToast } from "@/hooks/use-toast";
import Markdown from 'react-markdown';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSubmit } from "react-router";
import type { Route } from "./+types/Main";
import { extractTextFromPDF, sendToOpenAI } from "@/utils/backendUtils";
import { Spinner } from "@/components/ui/spinner";

export async function action({
  request,
}: Route.ActionArgs) {
  const formData = await request.formData();
  let file = formData.get("file") as File;
  let language = formData.get("language") as string;
  const pdfBuffer = new Uint8Array(await file?.arrayBuffer());
  const textContent = await extractTextFromPDF(pdfBuffer);
  const responseText = await sendToOpenAI(textContent, language);
  return { "success": true, extractedText: responseText };
}

export default function Component({ actionData }: Route.ComponentProps) {
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [loading, setLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const submit = useSubmit();
  const data = actionData?.extractedText;

  const handleUploadSuccess = async (file: File | null) => {

    try {
      const fileData = file;
      if (!file) {
        console.error("Error fetching file data");
      }
      else {
        const fileBlob = new Blob([file]);
        const formData = new FormData();
        formData.append('file', fileBlob, fileData?.name);
        formData.append('language', selectedLanguage);
        submit(formData, { method: "post", encType: "multipart/form-data" });
        setLoading(true);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error processing file:", error);
        toast({
          title: "Processing Failed",
          description: error.message || "Failed to process the file. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <>
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
      </div>

      <FileUpload onUploadSuccess={handleUploadSuccess} />
      {loading && !data ? <Spinner size="small" /> : null}
      {data && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-md border border-gray-200">
            <pre className="whitespace-pre-wrap font-mono text-sm">
              <Markdown>{data}</Markdown>
            </pre>
          </div>
        </div>
      )}
    </>
  );
};

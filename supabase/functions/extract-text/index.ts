import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  TextractClient, 
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand
} from "npm:@aws-sdk/client-textract";
import { TranslateClient, TranslateTextCommand } from "npm:@aws-sdk/client-translate";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const textractClient = new TextractClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') || '',
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') || '',
  },
});

const translateClient = new TranslateClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') || '',
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') || '',
  },
});

async function waitForJobCompletion(jobId: string): Promise<string[]> {
  console.log(`Waiting for job completion: ${jobId}`);
  const textBlocks: string[] = [];
  
  while (true) {
    const getCommand = new GetDocumentTextDetectionCommand({
      JobId: jobId,
    });

    try {
      const response = await textractClient.send(getCommand);
      console.log("Job status:", response.JobStatus);

      if (response.JobStatus === 'SUCCEEDED') {
        response.Blocks?.forEach(block => {
          if (block.BlockType === 'LINE' && block.Text) {
            textBlocks.push(block.Text);
          }
        });

        if (response.NextToken) {
          const nextCommand = new GetDocumentTextDetectionCommand({
            JobId: jobId,
            NextToken: response.NextToken,
          });
          const nextResponse = await textractClient.send(nextCommand);
          nextResponse.Blocks?.forEach(block => {
            if (block.BlockType === 'LINE' && block.Text) {
              textBlocks.push(block.Text);
            }
          });
        }
        break;
      } else if (response.JobStatus === 'FAILED') {
        throw new Error('Textract job failed');
      }

      // Wait for 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error("Error checking job status:", error);
      throw error;
    }
  }

  return textBlocks;
}

async function translateText(text: string, targetLanguage: string): Promise<string> {
  if (targetLanguage === 'en') return text;

  try {
    const command = new TranslateTextCommand({
      Text: text,
      SourceLanguageCode: 'en',
      TargetLanguageCode: targetLanguage,
    });

    const response = await translateClient.send(command);
    return response.TranslatedText || text;
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing request...");
    const formData = await req.formData();
    const file = formData.get('file');
    const language = formData.get('language')?.toString() || 'en';

    console.log("Received request with language:", language);

    if (!file || !(file instanceof File)) {
      throw new Error('No file provided');
    }

    console.log("File details:", {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Convert file to base64
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Start async document detection
    const startCommand = new StartDocumentTextDetectionCommand({
      DocumentLocation: {
        Bytes: bytes
      }
    });

    console.log("Starting document text detection...");
    const startResponse = await textractClient.send(startCommand);
    
    if (!startResponse.JobId) {
      throw new Error('Failed to start text detection job');
    }

    console.log("Job started with ID:", startResponse.JobId);
    
    // Wait for job completion and get text blocks
    const textBlocks = await waitForJobCompletion(startResponse.JobId);
    const extractedText = textBlocks.join('\n');

    console.log("Text extraction completed, translating...");
    
    // Translate the extracted text if needed
    const translatedText = await translateText(extractedText, language);

    console.log("Processing completed successfully");
    
    return new Response(
      JSON.stringify({ extractedText: translatedText }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );

  } catch (error) {
    console.error("Error in extract-text function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );
  }
});
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { 
  TextractClient, 
  StartDocumentAnalysisCommand,
  GetDocumentAnalysisCommand,
  StartDocumentAnalysisCommandInput
} from "npm:@aws-sdk/client-textract";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { fileId } = await req.json()
    console.log('Processing file ID:', fileId)

    // Initialize Supabase Admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get file details from database
    const { data: fileData, error: fileError } = await supabaseAdmin
      .from('uploaded_files')
      .select('*')
      .eq('id', fileId)
      .single()

    if (fileError || !fileData) {
      console.error('Error fetching file details:', fileError)
      throw new Error('File not found')
    }

    console.log('File data retrieved:', {
      filename: fileData.filename,
      path: fileData.file_path,
      size: fileData.size,
      contentType: fileData.content_type
    })

    // Get the file from storage
    const { data: fileBytes, error: downloadError } = await supabaseAdmin
      .storage
      .from('temp_pdfs')
      .download(fileData.file_path)

    if (downloadError || !fileBytes) {
      console.error('Error downloading file:', downloadError)
      throw new Error('Could not download file')
    }

    console.log('File downloaded successfully, size:', fileBytes.size)

    // Initialize AWS Textract client
    const textract = new TextractClient({
      region: "us-east-1",
      credentials: {
        accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    });

    console.log('AWS Textract client initialized')

    // Convert blob to ArrayBuffer and then to Uint8Array
    const arrayBuffer = await fileBytes.arrayBuffer()
    const documentBytes = new Uint8Array(arrayBuffer)

    // Start asynchronous document analysis
    const startAnalysisInput: StartDocumentAnalysisCommandInput = {
      DocumentLocation: {
        S3Object: {
          Bucket: 'temp_pdfs',
          Name: fileData.file_path
        }
      },
      FeatureTypes: ['FORMS', 'TABLES']
    };

    console.log('Starting document analysis with input:', startAnalysisInput)

    const startCommand = new StartDocumentAnalysisCommand(startAnalysisInput);
    const startResponse = await textract.send(startCommand);

    if (!startResponse.JobId) {
      throw new Error('Failed to start document analysis');
    }

    console.log('Analysis started with JobId:', startResponse.JobId);

    // Poll for completion (with timeout)
    const maxAttempts = 30;
    let attempts = 0;
    let extractedText = '';

    while (attempts < maxAttempts) {
      const getCommand = new GetDocumentAnalysisCommand({
        JobId: startResponse.JobId
      });

      const getResponse = await textract.send(getCommand);
      console.log('Job status:', getResponse.JobStatus);

      if (getResponse.JobStatus === 'SUCCEEDED') {
        // Process blocks similar to before, but handle pagination
        let blocks = getResponse.Blocks || [];
        
        blocks.forEach((block) => {
          if (block.BlockType === 'LINE') {
            extractedText += (block.Text || '') + '\n';
          } else if (block.BlockType === 'CELL') {
            extractedText += (block.Text || '') + '\t';
          }
        });

        // Handle pagination if NextToken exists
        while (getResponse.NextToken) {
          const nextPageCommand = new GetDocumentAnalysisCommand({
            JobId: startResponse.JobId,
            NextToken: getResponse.NextToken
          });
          const nextPageResponse = await textract.send(nextPageCommand);
          nextPageResponse.Blocks?.forEach((block) => {
            if (block.BlockType === 'LINE') {
              extractedText += (block.Text || '') + '\n';
            } else if (block.BlockType === 'CELL') {
              extractedText += (block.Text || '') + '\t';
            }
          });
        }

        break;
      } else if (getResponse.JobStatus === 'FAILED') {
        throw new Error('Document analysis failed');
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error('Document analysis timed out');
    }

    console.log('Text extraction completed successfully');

    return new Response(
      JSON.stringify({ text: extractedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Detailed error in extract-text function:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    })

    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: {
          name: error.name,
          message: error.message,
          cause: error.cause
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})
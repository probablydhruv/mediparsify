import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { 
  TextractClient, 
  AnalyzeDocumentCommand,
} from "npm:@aws-sdk/client-textract"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = new Date();
  console.log(`Processing started at: ${startTime.toISOString()}`);

  try {
    const { fileId } = await req.json()
    console.log("Processing file ID:", fileId)

    if (!fileId) {
      throw new Error('No fileId provided')
    }

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get file details from database
    console.log("Fetching file details from database...")
    const { data: fileData, error: fileError } = await supabaseAdmin
      .from('uploaded_files')
      .select('*')
      .eq('id', fileId)
      .single()

    if (fileError || !fileData) {
      console.error('Error fetching file details:', fileError)
      throw new Error('File not found in database')
    }

    // Check file size
    console.log(`File size: ${fileData.size} bytes`);
    if (fileData.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    console.log("File metadata retrieved:", {
      filename: fileData.filename,
      path: fileData.file_path,
      size: fileData.size
    })

    // Download file from Supabase Storage
    console.log("Downloading file from Supabase storage...")
    const { data: fileBytes, error: downloadError } = await supabaseAdmin
      .storage
      .from('temp_pdfs')
      .download(fileData.file_path)

    if (downloadError || !fileBytes) {
      console.error('Error downloading file from Supabase:', downloadError)
      throw new Error('Could not download file from Supabase storage')
    }

    // Convert file to buffer
    const buffer = await fileBytes.arrayBuffer()

    // Initialize Textract client
    console.log("Initializing Textract client...")
    const textract = new TextractClient({
      region: Deno.env.get('AWS_REGION') ?? 'ap-south-1',
      credentials: {
        accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    })

    // Process document with Textract
    console.log("Sending document to Textract for analysis...")
    const command = new AnalyzeDocumentCommand({
      Document: {
        Bytes: new Uint8Array(buffer)
      },
      FeatureTypes: ['FORMS', 'TABLES']
    })

    const response = await textract.send(command)
    
    // Extract text and analyze document properties
    let extractedText = ''
    let pageCount = 0
    const pageNumbers = new Set()

    response.Blocks?.forEach((block) => {
      if (block.BlockType === 'LINE') {
        extractedText += (block.Text || '') + '\n'
      }
      if (block.Page) {
        pageNumbers.add(block.Page)
      }
    })

    pageCount = pageNumbers.size
    console.log(`Number of pages detected: ${pageCount}`);

    const endTime = new Date();
    const processingTime = endTime.getTime() - startTime.getTime();
    console.log(`Processing completed at: ${endTime.toISOString()}`);
    console.log(`Total processing time: ${processingTime}ms`);

    return new Response(
      JSON.stringify({ 
        text: extractedText,
        pageCount,
        processingTimeMs: processingTime,
        message: "Processing completed successfully" 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )

  } catch (error) {
    const endTime = new Date();
    console.error('Detailed error in extract-text function:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
      timestamp: endTime.toISOString()
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
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { 
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "npm:@aws-sdk/client-s3"
import { 
  TextractClient, 
  AnalyzeDocumentCommand,
} from "npm:@aws-sdk/client-textract"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { fileId } = await req.json()
    console.log("Processing file ID:", fileId)

    if (!fileId) {
      throw new Error('No fileId provided')
    }

    // Initialize clients
    console.log("Initializing AWS clients...")
    const s3Client = new S3Client({
      region: Deno.env.get('AWS_REGION') ?? 'ap-south-1',
      credentials: {
        accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    })

    const textract = new TextractClient({
      region: Deno.env.get('AWS_REGION') ?? 'ap-south-1',
      credentials: {
        accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    })

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
    
    // Process with Textract directly using the buffer
    console.log("Processing with Textract...")
    try {
      const analyzeCommand = new AnalyzeDocumentCommand({
        Document: {
          Bytes: new Uint8Array(buffer)
        },
        FeatureTypes: ['FORMS', 'TABLES']
      })

      console.log("Sending document to Textract...")
      const analyzeResponse = await textract.send(analyzeCommand)
      console.log('Textract analysis successful')

      let extractedText = ''
      analyzeResponse.Blocks?.forEach((block) => {
        if (block.BlockType === 'LINE') {
          extractedText += (block.Text || '') + '\n'
        }
      })

      console.log('Text extraction completed successfully')
      
      return new Response(
        JSON.stringify({ 
          text: extractedText,
          message: "Processing completed successfully" 
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
        }
      )

    } catch (textractError) {
      console.error('Textract processing error:', textractError)
      throw new Error(`Failed to process document with Textract: ${textractError.message}`)
    }

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
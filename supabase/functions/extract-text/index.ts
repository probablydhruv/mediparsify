import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { TextractClient, AnalyzeDocumentCommand } from "npm:@aws-sdk/client-textract";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Convert blob to ArrayBuffer and then to Uint8Array
    const arrayBuffer = await fileBytes.arrayBuffer()
    const pdfBytes = new Uint8Array(arrayBuffer)

    console.log('PDF bytes prepared, size:', pdfBytes.length)

    // Initialize AWS Textract client
    const textract = new TextractClient({
      region: "us-east-1",
      credentials: {
        accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    });

    console.log('AWS Textract client initialized')

    // Create Textract command with PDF bytes
    const command = new AnalyzeDocumentCommand({
      Document: {
        Bytes: pdfBytes
      },
      FeatureTypes: ['FORMS', 'TABLES']
    });

    console.log('Sending document to Textract for analysis...')
    
    // Process document with Textract
    const response = await textract.send(command)
    
    console.log('Received response from Textract:', {
      blocksCount: response.Blocks?.length ?? 0,
      hasBlocks: !!response.Blocks?.length,
      firstBlockType: response.Blocks?.[0]?.BlockType
    })

    // Extract text from blocks
    let extractedText = '';
    
    // Process each block based on its type
    response.Blocks?.forEach(block => {
      if (block.BlockType === 'LINE' && block.Text) {
        extractedText += block.Text + '\n';
      } else if (block.BlockType === 'WORD' && block.Text) {
        extractedText += block.Text + ' ';
      } else if (block.BlockType === 'CELL' && block.Text) {
        extractedText += block.Text + '\t';
      }
    });

    console.log('Text extraction completed:', {
      textLength: extractedText.length,
      firstFewChars: extractedText.substring(0, 100)
    })

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
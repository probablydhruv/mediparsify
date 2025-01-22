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
    const documentBytes = new Uint8Array(arrayBuffer)

    console.log('Document bytes prepared, size:', documentBytes.length)

    // Initialize AWS Textract client with explicit region
    const textract = new TextractClient({
      region: "us-east-1",
      credentials: {
        accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    });

    console.log('AWS Textract client initialized')

    // Create Textract command with proper configuration for PDF
    const command = new AnalyzeDocumentCommand({
      Document: {
        Bytes: documentBytes
      },
      FeatureTypes: ['FORMS', 'TABLES'],
    });

    console.log('Sending document to Textract for analysis with features:', command.input.FeatureTypes)
    
    // Process document with Textract
    const response = await textract.send(command)
    
    console.log('Received response from Textract:', {
      blocksCount: response.Blocks?.length ?? 0,
      hasBlocks: !!response.Blocks?.length,
      blockTypes: response.Blocks?.map(b => b.BlockType).filter((v, i, a) => a.indexOf(v) === i)
    })

    // Extract text from blocks with improved handling
    let extractedText = '';
    let currentTable = [];
    let isInTable = false;
    
    response.Blocks?.forEach((block, index) => {
      if (block.BlockType === 'TABLE') {
        isInTable = true;
        if (currentTable.length > 0) {
          extractedText += currentTable.join('\t') + '\n';
          currentTable = [];
        }
      } else if (block.BlockType === 'CELL' && isInTable) {
        currentTable.push(block.Text || '');
        if (block.RowIndex === 1 && block.ColumnIndex === 1) {
          extractedText += '\nTable:\n';
        }
        if (block.ColumnIndex === block.ColumnSpan) {
          extractedText += currentTable.join('\t') + '\n';
          currentTable = [];
        }
      } else if (block.BlockType === 'LINE') {
        if (isInTable) {
          isInTable = false;
          if (currentTable.length > 0) {
            extractedText += currentTable.join('\t') + '\n';
            currentTable = [];
          }
          extractedText += '\n';
        }
        extractedText += (block.Text || '') + '\n';
      }
    });

    // Add any remaining table content
    if (currentTable.length > 0) {
      extractedText += currentTable.join('\t') + '\n';
    }

    console.log('Text extraction completed:', {
      textLength: extractedText.length,
      firstFewChars: extractedText.substring(0, 100),
      tableCount: response.Blocks?.filter(b => b.BlockType === 'TABLE').length ?? 0
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
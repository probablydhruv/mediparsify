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

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get file details from the database
    const { data: fileData, error: fileError } = await supabaseAdmin
      .from('uploaded_files')
      .select('*')
      .eq('id', fileId)
      .single()

    if (fileError || !fileData) {
      console.error('Error fetching file details:', fileError)
      throw new Error('File not found')
    }

    // Get the file from storage
    const { data: fileBytes, error: downloadError } = await supabaseAdmin
      .storage
      .from('temp_pdfs')
      .download(fileData.file_path)

    if (downloadError || !fileBytes) {
      console.error('Error downloading file:', downloadError)
      throw new Error('Could not download file')
    }

    // Initialize AWS Textract client
    const textract = new TextractClient({
      region: "us-east-1",
      credentials: {
        accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    });

    // Convert file to buffer for Textract
    const buffer = await fileBytes.arrayBuffer()

    // Create Textract command
    const command = new AnalyzeDocumentCommand({
      Document: {
        Bytes: new Uint8Array(buffer)
      },
      FeatureTypes: ['FORMS', 'TABLES']
    });

    console.log('Sending document to Textract...')
    const response = await textract.send(command)
    console.log('Received response from Textract')

    // Extract text from blocks
    const extractedText = response.Blocks?.filter(block => block.Text)
      .map(block => block.Text)
      .join('\n') ?? ''

    console.log('Extracted text length:', extractedText.length)

    return new Response(
      JSON.stringify({ text: extractedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in extract-text function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
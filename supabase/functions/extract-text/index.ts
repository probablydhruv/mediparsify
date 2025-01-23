import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { 
  TextractClient, 
  StartDocumentAnalysisCommand,
  GetDocumentAnalysisCommand,
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

    // Initialize Textract client
    console.log("Initializing Textract client...")
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
    
    // Start asynchronous document analysis
    console.log("Starting document analysis with Textract...")
    try {
      const startCommand = new StartDocumentAnalysisCommand({
        DocumentLocation: {
          Bytes: new Uint8Array(buffer)
        },
        FeatureTypes: ['FORMS', 'TABLES']
      })

      console.log("Sending document to Textract...")
      const startResponse = await textract.send(startCommand)
      
      if (!startResponse.JobId) {
        throw new Error('No JobId received from Textract')
      }

      console.log("Analysis started with JobId:", startResponse.JobId)

      // Poll for results
      let analysisComplete = false
      let maxAttempts = 30 // Maximum number of polling attempts
      let attempts = 0
      let extractedText = ''

      while (!analysisComplete && attempts < maxAttempts) {
        console.log(`Polling attempt ${attempts + 1} of ${maxAttempts}...`)
        
        const getResultsCommand = new GetDocumentAnalysisCommand({
          JobId: startResponse.JobId
        })

        const analysisResponse = await textract.send(getResultsCommand)
        
        if (analysisResponse.JobStatus === 'SUCCEEDED') {
          console.log("Analysis completed successfully")
          analysisComplete = true
          
          // Extract text from blocks
          analysisResponse.Blocks?.forEach((block) => {
            if (block.BlockType === 'LINE') {
              extractedText += (block.Text || '') + '\n'
            }
          })
        } else if (analysisResponse.JobStatus === 'FAILED') {
          throw new Error(`Analysis failed: ${analysisResponse.StatusMessage}`)
        }

        if (!analysisComplete) {
          attempts++
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second before next poll
        }
      }

      if (!analysisComplete) {
        throw new Error('Document analysis timed out')
      }

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
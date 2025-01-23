import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { PDFDocument } from 'https://cdn.skypack.dev/pdf-lib'
import { TextractClient, AnalyzeDocumentCommand } from "npm:@aws-sdk/client-textract"

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
    console.log("Starting processing for file ID:", fileId)

    if (!fileId) {
      throw new Error('No fileId provided')
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log("Fetching file details from database...")
    const { data: fileData, error: fileError } = await supabase
      .from('uploaded_files')
      .select('*')
      .eq('id', fileId)
      .maybeSingle()

    if (fileError) {
      console.error('Database error:', fileError)
      throw new Error('Failed to fetch file details from database')
    }

    if (!fileData) {
      throw new Error('File not found in database')
    }

    console.log("File metadata retrieved:", {
      filename: fileData.filename,
      path: fileData.file_path,
      size: fileData.size
    })

    // Download file from Supabase Storage
    console.log("Downloading file from storage...")
    const { data: fileBytes, error: downloadError } = await supabase
      .storage
      .from('temp_pdfs')
      .download(fileData.file_path)

    if (downloadError) {
      console.error('Storage download error:', downloadError)
      throw new Error('Failed to download file from storage')
    }

    if (!fileBytes) {
      throw new Error('No file content received from storage')
    }

    // Load PDF document
    console.log("Converting PDF to ArrayBuffer...")
    const pdfArrayBuffer = await fileBytes.arrayBuffer()
    
    console.log("Loading PDF document...")
    const pdfDoc = await PDFDocument.load(pdfArrayBuffer)
    const pageCount = pdfDoc.getPageCount()
    console.log(`PDF has ${pageCount} pages`)

    // Initialize Textract client
    console.log("Initializing Textract client...")
    const textract = new TextractClient({
      region: 'ap-south-1',
      credentials: {
        accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    })

    // Process each page
    const pageResults = []
    for (let i = 0; i < pageCount; i++) {
      console.log(`Processing page ${i + 1} of ${pageCount}...`)
      
      try {
        // Convert page to PNG
        const page = pdfDoc.getPage(i)
        console.log(`Converting page ${i + 1} to PNG...`)
        const pngBytes = await page.png({
          width: Math.floor(page.getWidth() * 2),
          height: Math.floor(page.getHeight() * 2),
        })

        // Process with Textract
        console.log(`Sending page ${i + 1} to Textract...`)
        const command = new AnalyzeDocumentCommand({
          Document: {
            Bytes: pngBytes
          },
          FeatureTypes: ['FORMS', 'TABLES']
        })

        const response = await textract.send(command)
        let pageText = ''
        
        response.Blocks?.forEach((block) => {
          if (block.BlockType === 'LINE') {
            pageText += (block.Text || '') + '\n'
          }
        })

        pageResults.push({
          pageNumber: i + 1,
          text: pageText
        })
        
        console.log(`Successfully processed page ${i + 1}`)
      } catch (error) {
        console.error(`Error processing page ${i + 1}:`, error)
        throw new Error(`Failed to process page ${i + 1}: ${error.message}`)
      }
    }

    // Combine results
    console.log("Combining results from all pages...")
    const combinedText = pageResults.map(result => 
      `--- Page ${result.pageNumber} ---\n${result.text}`
    ).join('\n\n')

    console.log("Processing completed successfully")
    return new Response(
      JSON.stringify({ 
        text: combinedText,
        pageCount,
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
    console.error('Error in extract-text function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
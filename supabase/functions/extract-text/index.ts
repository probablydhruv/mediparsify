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
    console.log("Processing file ID:", fileId)

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
    const { data: fileBytes, error: downloadError } = await supabase
      .storage
      .from('temp_pdfs')
      .download(fileData.file_path)

    if (downloadError || !fileBytes) {
      console.error('Error downloading file from Supabase:', downloadError)
      throw new Error('Could not download file from Supabase storage')
    }

    // Load PDF document
    console.log("Loading PDF document...")
    const pdfDoc = await PDFDocument.load(await fileBytes.arrayBuffer())
    const pageCount = pdfDoc.getPageCount()
    console.log(`PDF has ${pageCount} pages`)

    // Initialize Textract client
    const textract = new TextractClient({
      region: Deno.env.get('AWS_REGION') ?? 'ap-south-1',
      credentials: {
        accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    })

    // Process each page
    const pageResults = []
    for (let i = 0; i < pageCount; i++) {
      console.log(`Processing page ${i + 1} of ${pageCount}...`)
      
      // Convert page to PNG
      const page = pdfDoc.getPage(i)
      const pngBytes = await page.png({
        width: page.getWidth() * 2,
        height: page.getHeight() * 2,
      })

      // Process with Textract
      const command = new AnalyzeDocumentCommand({
        Document: {
          Bytes: pngBytes
        },
        FeatureTypes: ['FORMS', 'TABLES']
      })

      try {
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
      } catch (error) {
        console.error(`Error processing page ${i + 1}:`, error)
        throw new Error(`Failed to process page ${i + 1}`)
      }
    }

    // Combine results
    console.log("Combining results from all pages...")
    const combinedText = pageResults.map(result => 
      `--- Page ${result.pageNumber} ---\n${result.text}`
    ).join('\n\n')

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
          message: error.message
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})
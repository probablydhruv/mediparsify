import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { TextractClient, AnalyzeDocumentCommand } from "npm:@aws-sdk/client-textract";
import * as pdfjs from 'npm:pdfjs-dist';

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
      size: fileData.size
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

    // Convert PDF to images
    const pdfData = new Uint8Array(await fileBytes.arrayBuffer());
    const loadingTask = pdfjs.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    console.log('PDF loaded, pages:', pdf.numPages);

    // Initialize AWS Textract client
    const textract = new TextractClient({
      region: "us-east-1",
      credentials: {
        accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    });

    console.log('AWS Textract client initialized');

    let allText = [];

    // Process each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      console.log(`Processing page ${pageNum}`);
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });

      // Create canvas and context
      const canvas = new OffscreenCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');
      
      // Render PDF page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      // Convert canvas to PNG
      const imageBlob = await canvas.convertToBlob({ type: 'image/png' });
      const imageBuffer = await imageBlob.arrayBuffer();

      // Send to Textract
      const command = new AnalyzeDocumentCommand({
        Document: {
          Bytes: new Uint8Array(imageBuffer)
        },
        FeatureTypes: ['FORMS', 'TABLES']
      });

      console.log(`Sending page ${pageNum} to Textract...`);
      const response = await textract.send(command);
      console.log(`Received response from Textract for page ${pageNum}:`, {
        blocksCount: response.Blocks?.length ?? 0
      });

      // Extract text from blocks
      const pageText = response.Blocks?.filter(block => block.Text)
        .map(block => block.Text)
        .join('\n') ?? '';

      allText.push(pageText);
    }

    // Combine text from all pages
    const finalText = allText.join('\n\n=== Page Break ===\n\n');

    return new Response(
      JSON.stringify({ text: finalText }),
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
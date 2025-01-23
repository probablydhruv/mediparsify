import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { 
  S3Client,
  PutObjectCommand,
} from "npm:@aws-sdk/client-s3"
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { fileId } = await req.json()
    console.log('Starting text extraction process for file ID:', fileId)

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

    console.log('Retrieved file metadata:', {
      filename: fileData.filename,
      path: fileData.file_path,
      size: fileData.size
    })

    // Download file from Supabase Storage
    const { data: fileBytes, error: downloadError } = await supabaseAdmin
      .storage
      .from('temp_pdfs')
      .download(fileData.file_path)

    if (downloadError || !fileBytes) {
      console.error('Error downloading file from Supabase:', downloadError)
      throw new Error('Could not download file from Supabase storage')
    }

    console.log('Successfully downloaded file from Supabase storage')

    // Initialize AWS clients
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

    // Upload to S3
    console.log('Starting file transfer to S3...')
    const s3Key = `uploads/${fileData.file_path}`
    
    try {
      const arrayBuffer = await fileBytes.arrayBuffer()
      const uploadCommand = new PutObjectCommand({
        Bucket: Deno.env.get('AWS_S3_BUCKET_NAME'),
        Key: s3Key,
        Body: new Uint8Array(arrayBuffer),
        ContentType: fileData.content_type,
      })

      await s3Client.send(uploadCommand)
      console.log('File successfully uploaded to S3:', s3Key)
    } catch (s3Error) {
      console.error('S3 upload error:', s3Error)
      throw new Error('Failed to upload file to S3')
    }

    // Start Textract processing
    console.log('Initiating Textract processing...')
    try {
      const startCommand = new StartDocumentAnalysisCommand({
        DocumentLocation: {
          S3Object: {
            Bucket: Deno.env.get('AWS_S3_BUCKET_NAME'),
            Name: s3Key
          }
        },
        FeatureTypes: ['FORMS', 'TABLES']
      })

      const startResponse = await textract.send(startCommand)
      
      if (!startResponse.JobId) {
        throw new Error('Failed to start Textract analysis')
      }

      console.log('Textract job started with ID:', startResponse.JobId)

      // Poll for completion
      const maxAttempts = 30
      let attempts = 0
      let extractedText = ''

      while (attempts < maxAttempts) {
        const getCommand = new GetDocumentAnalysisCommand({
          JobId: startResponse.JobId
        })

        const getResponse = await textract.send(getCommand)
        console.log('Textract job status:', getResponse.JobStatus)

        if (getResponse.JobStatus === 'SUCCEEDED') {
          let blocks = getResponse.Blocks || []
          
          blocks.forEach((block) => {
            if (block.BlockType === 'LINE') {
              extractedText += (block.Text || '') + '\n'
            } else if (block.BlockType === 'CELL') {
              extractedText += (block.Text || '') + '\t'
            }
          })

          while (getResponse.NextToken) {
            const nextPageCommand = new GetDocumentAnalysisCommand({
              JobId: startResponse.JobId,
              NextToken: getResponse.NextToken
            })
            const nextPageResponse = await textract.send(nextPageCommand)
            nextPageResponse.Blocks?.forEach((block) => {
              if (block.BlockType === 'LINE') {
                extractedText += (block.Text || '') + '\n'
              } else if (block.BlockType === 'CELL') {
                extractedText += (block.Text || '') + '\t'
              }
            })
          }

          console.log('Textract processing complete')
          break
        } else if (getResponse.JobStatus === 'FAILED') {
          console.error('Textract job failed')
          throw new Error('Document analysis failed')
        }

        await new Promise(resolve => setTimeout(resolve, 1000))
        attempts++
      }

      if (attempts >= maxAttempts) {
        throw new Error('Document analysis timed out')
      }

      return new Response(
        JSON.stringify({ text: extractedText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (textractError) {
      console.error('Textract processing error:', textractError)
      throw new Error('Failed to process document with Textract')
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
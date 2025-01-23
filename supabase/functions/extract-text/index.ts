import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

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

    // Fetch file details
    const { data: fileData, error: fileError } = await supabase
      .from('uploaded_files')
      .select('*')
      .eq('id', fileId)
      .single()

    if (fileError) throw fileError
    if (!fileData) throw new Error('File not found')

    // Get file URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('temp_pdfs')
      .getPublicUrl(fileData.file_path)

    return new Response(
      JSON.stringify({ 
        message: 'File processed successfully',
        url: publicUrl,
        filename: fileData.filename,
        size: fileData.size,
        type: fileData.content_type
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('Error processing file:', error)
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
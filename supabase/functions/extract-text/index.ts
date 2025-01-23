import { TextractClient, DetectDocumentTextCommand } from "npm:@aws-sdk/client-textract";
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const handler = async (req: Request) => {
  console.log('Extract text function called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const language = formData.get('language') || 'en';

    if (!file) {
      console.error('No file uploaded');
      return new Response(
        JSON.stringify({ error: 'No file uploaded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('File received:', (file as any).name, 'Size:', (file as any).size, 'Language:', language);

    // Check AWS credentials
    const awsAccessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const awsSecretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');

    if (!awsAccessKeyId || !awsSecretAccessKey) {
      console.error('AWS credentials not found');
      return new Response(
        JSON.stringify({ error: 'AWS credentials not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const textractClient = new TextractClient({
      region: "us-east-1",
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Get the file data as a Uint8Array
    const fileData = await (file as unknown as Blob).arrayBuffer();
    const buffer = new Uint8Array(fileData);

    // Process with AWS Textract
    console.log('Sending to AWS Textract');
    const command = new DetectDocumentTextCommand({
      Document: {
        Bytes: buffer
      }
    });

    const textractResponse = await textractClient.send(command);
    console.log('Received Textract response');

    // Extract text from Textract response
    const extractedText = textractResponse.Blocks?.filter(block => block.BlockType === 'LINE')
      .map(block => block.Text)
      .join('\n') || '';

    console.log('Extracted text length:', extractedText.length);

    // Upload file to Supabase Storage
    const fileExt = (file as any).name.split('.').pop();
    const filePath = `${crypto.randomUUID()}.${fileExt}`;

    console.log('Uploading to Supabase Storage:', filePath);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('temp_pdfs')
      .upload(filePath, buffer, {
        contentType: (file as any).type,
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw uploadError;
    }

    // Save file metadata to database
    const { data: fileRecord, error: dbError } = await supabase
      .from('uploaded_files')
      .insert({
        filename: (file as any).name,
        file_path: filePath,
        content_type: (file as any).type,
        size: (file as any).size
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      throw dbError;
    }

    console.log('Successfully processed file:', fileRecord.id);

    return new Response(
      JSON.stringify({
        message: 'File processed successfully',
        fileId: fileRecord.id,
        extractedText,
        language
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Processing error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process file',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
};
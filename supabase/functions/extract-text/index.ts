import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";
import { createClient } from '@supabase/supabase-js';

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

    if (!file) {
      console.error('No file uploaded');
      return new Response(
        JSON.stringify({ error: 'No file uploaded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('File received:', file.name, 'Size:', file.size);

    const textractClient = new TextractClient({
      region: "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get the file data as a Uint8Array
    const fileData = await (file as unknown as Blob).arrayBuffer();
    const buffer = Buffer.from(fileData);

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
    const fileExt = file.name.split('.').pop();
    const filePath = `${crypto.randomUUID()}.${fileExt}`;

    console.log('Uploading to Supabase Storage:', filePath);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('temp_pdfs')
      .upload(filePath, buffer, {
        contentType: file.type,
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
        filename: file.name,
        file_path: filePath,
        content_type: file.type,
        size: file.size
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
        extractedText
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
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { TextractClient, DetectDocumentTextCommand } from "npm:@aws-sdk/client-textract";
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('Extract text function initialized');

export const handler = async (req: Request) => {
  console.log('Extract text function called');

  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting to process request...');
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
      console.error('AWS credentials not found or invalid');
      return new Response(
        JSON.stringify({ error: 'AWS credentials not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('AWS credentials verified successfully');

    const textractClient = new TextractClient({
      region: "us-east-1",
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
    });

    console.log('TextractClient initialized');

    // Get the file data as a Uint8Array
    console.log('Converting file to buffer...');
    const fileData = await (file as unknown as Blob).arrayBuffer();
    const buffer = new Uint8Array(fileData);
    console.log('File converted to buffer successfully');

    // Process with AWS Textract
    console.log('Sending to AWS Textract...');
    const command = new DetectDocumentTextCommand({
      Document: {
        Bytes: buffer
      }
    });

    console.log('Awaiting Textract response...');
    const textractResponse = await textractClient.send(command);
    console.log('Received Textract response:', JSON.stringify(textractResponse, null, 2));

    // Extract text from Textract response
    const extractedText = textractResponse.Blocks?.filter(block => block.BlockType === 'LINE')
      .map(block => block.Text)
      .join('\n') || '';

    console.log('Extracted text length:', extractedText.length);

    return new Response(
      JSON.stringify({
        message: 'Text extracted successfully',
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
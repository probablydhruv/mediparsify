import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import OpenAI from "https://esm.sh/openai@4.20.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log("Extract text function called");

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing request...");
    const formData = await req.formData();
    const file = formData.get('file');
    const language = formData.get('language') || 'en';

    console.log("Received file:", {
      name: file?.name,
      type: file?.type,
      size: file?.size,
      language: language
    });

    if (!file) {
      console.error("No file provided in request");
      throw new Error('No file provided');
    }

    // Initialize OpenAI client
    console.log("Initializing OpenAI client");
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')
    });

    if (!openai.apiKey) {
      console.error("OpenAI API key not found");
      throw new Error('OpenAI API key not configured');
    }

    // Convert file to base64
    console.log("Converting file to base64");
    const fileBuffer = await file.arrayBuffer();
    const base64String = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));

    console.log("Sending request to OpenAI");
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that extracts and summarizes text from documents. Please extract the text from the following document and provide it in ${language} language.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please extract and summarize the text from this document:"
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${file.type};base64,${base64String}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    console.log("Received response from OpenAI");
    const extractedText = response.choices[0]?.message?.content;

    if (!extractedText) {
      console.error("No text extracted from OpenAI response");
      throw new Error('Failed to extract text from document');
    }

    console.log("Successfully extracted text, returning response");
    return new Response(
      JSON.stringify({ extractedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in extract-text function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
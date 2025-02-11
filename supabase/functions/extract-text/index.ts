import OpenAI from "npm:openai";
import * as pdfjsLib from "npm:pdfjs-dist";
import { corsHeaders } from "../_shared/cors.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function extractTextFromPDF(pdfBuffer: Uint8Array) {
    const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
    const pdf = await loadingTask.promise;
    let textContent = "";
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const text = await page.getTextContent();
        textContent += text.items.map((item) => item.str).join(" ") + "\n";
    }
    return textContent;
}

async function sendToOpenAI(text: string, language: string) {
    const prompt = `Extract medical test results and interpretations from the given text and format them in ${language}. Follow this format:**Test Name:** <value>\n - **Result:** <value>\n - **Reference Range:** <value>\n - **Interpretation Summary:** <summary>. Keep it concise and to the point.`;

    const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "system", content: prompt }, { role: "user", content: text }],
    });
    // console.log("hit ", OPENAI_API_KEY);
    return response.choices[0].message.content;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const formData = await req.formData();
    const file = formData.get("file");
    const language = formData.get("language") || "English";
    console.log(language);

    if (!file || !(file instanceof File)) {
        return new Response(JSON.stringify({ error: "Invalid file" }), { headers: corsHeaders, status: 400 });
    }

    const pdfBuffer = new Uint8Array(await file.arrayBuffer());
    const extractedText = await extractTextFromPDF(pdfBuffer);
    const responseText = await sendToOpenAI(extractedText, language);

    return new Response(JSON.stringify({ extractedText: responseText }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
});

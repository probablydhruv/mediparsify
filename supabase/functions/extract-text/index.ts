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
    const prompt = `You are a medical report analyzer specializing in making complex medical information accessible and actionable for patients. Your task is to analyze the provided medical report and present it in a clear, empathetic, and informative way.
Use these indicators throughout your analysis: 🟢 for normal/good findings 🟡 for items that need monitoring 🟠 for items requiring attention ❤️ for positive health indicators ⚕️ for medical recommendations
Structure your response in the following way:
First, provide a "Quick Summary" section. In 3-4 sentences, explain the main findings of the report in simple language. Focus on what the patient needs to know immediately.
Next, create a "Key Findings" section where you:
	1	List all positive findings first, marked with ❤️
	2	List normal findings with 🟢
	3	List items needing monitoring with 🟡
	4	List items needing attention with 🟠
For any items marked with 🟡 or 🟠:
	•	Explain in simple terms what this means
	•	State how long it typically takes to resolve
	•	Provide specific, actionable steps to address it
	•	Include any relevant lifestyle modifications
Create a "What's Next" section with: ⚕️ Clear, bullet-pointed action items ⚕️ Timeline for any required follow-ups ⚕️ Any needed lifestyle changes ⚕️ Recommended tests or consultations
If there are any specific symptoms to monitor, include a "Stay Aware" section. List symptoms that would warrant contacting a healthcare provider, but phrase them in a calm, matter-of-fact way. Avoid alarming language.
Guidelines for your communication:
	•	Use everyday language
	•	Explain medical terms in parentheses when you must use them
	•	Keep sentences short and clear
	•	Present information in a positive, solution-focused way
	•	Highlight improvements and positive trends
	•	Balance honesty about concerns with reassurance about treatability
	•	Include typical resolution timeframes for any issues
	•	Mention lifestyle factors that can positively impact the condition
Remember to:
	•	Prioritize clarity over technical accuracy in language choice
	•	Make all action items specific and achievable
	•	Present monitoring guidelines as empowering rather than frightening
	•	Always highlight positive findings and improvements
	•	Include context for any numbers or test results
	•	Make next steps crystal clear
End with a "Good News Highlight" section that reinforces positive findings and improvements, giving the patient confidence and optimism while remaining realistic.
Keep your tone professional yet friendly, authoritative yet approachable, and informative yet reassuring. Your goal is to help patients understand their health status and feel empowered to take appropriate action.`;

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

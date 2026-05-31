import  {GoogleGenAI}  from "@google/genai";

 let client=null;
 const getClient=()=>{
    if(client) return client;
    const key=process.env.GEMINI_API_KEY;
    if (!key){
        return null;
    }
    client = new GoogleGenAI({
        apiKey: key,
    });
    return client;
 }

 const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

 export const isAIEnabled = () => !!process.env.GEMINI_API_KEY;

 export const parseJSON = (text) => {
    let cleaned = (text || "").trim();
    if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json\n/, "").replace(/```\n?$/g, "");
    } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/```\n?/g, "");
    }
    return JSON.parse(cleaned.trim());
};

export const chatCompletion = async ({ system,user,temperature=0.7 }) => {
    const c = getClient();
    if (!c) {
        return {
            ok: false,
            content: "AI features are not enabled. Please set the GEMINI_API_KEY in the backend .env file."
        };
    }
    try {
        const res = await c.models.generateContent({
            model: MODEL,
            contents: user,
            config: {
                systemInstruction: system,
                temperature,
            }
        });
        return { ok: true, content: (res.text || "").trim() };
    } catch (err) {
        console.error("AI error:", err);
        return { ok: false, content: "An error occurred while generating AI content." };
    }
};

export const SYSTEM_PROMPTS = {
    weekly:
    "You are a warm, encouraging habit coach. Analyze the user's last 7 days of habit data and write a short personalized report(120-180 words). Mention: what went well, what stuggled, patterns noticed and one specific peice of encouragement. Use the user's actual habits names. Be human , not generic. No markdown headers-use plain prose with line breaks.",
    suggestions:
    "You are a helpful habit coach. Based on the user's gaols, productive time , and past struggles, suggest exactly 3 specific habits (personalized to the user). return valid JSON only with this shape : {\"suggestions\":[{\"name\":\"...\", \"description\":\"...\",\"frequency\":,\"daily|weekly\",\"category\":\"Health|Fitness|Learning|Mindfulness|Productivity|Social|Creativity|Finance|Other\".\"icon\":\"<emoji>\",\"reason\":\"...\"}]}.No prose outside JSON.",
    recovery:
    "You are a compassionate habit recovery coach. The user broke a streak. write a 3-day recovery plan tailored to this specific habit. Be warm but actionable. Use this structure: short empathatic opening {1-2 lines}, then  day 1, day 2, day 3 sections with one concrete action each, then a closing line of encouragement. 150-220 words in total.",
    chat: 
    "You are a helpful habit analysis assistant. Answer the user's question using ONLY the provided habit data as context. Be specific - cite actual habit names, days, percentages. Keep replies under 120 words. If the data is insufficient, say so briefly.",
    morning:
    "You are a warm, motivating friend. Write a single short morning message (30 to 60 words) using the user's actual habit names and current streaks. Mention 1-2 specific habits. Be energetic but not cheesy. No emoji overload - max 1.",
};


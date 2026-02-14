import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { latitude, longitude } = await req.json();

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: "Latitude and longitude are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Given the GPS coordinates (${latitude}, ${longitude}), provide a JSON array of 15-20 real nearby places including hotels, restaurants, and tourist attractions/landmarks within ~25km. 

For each place, provide EXACTLY this JSON structure (no extra text, just the JSON array):
[
  {
    "name": "Place Name",
    "type": "hotel" | "restaurant" | "attraction",
    "category": "specific category like Luxury Hotel, Indian Restaurant, Historical Monument etc",
    "latitude": number,
    "longitude": number,
    "rating": number (1-5, realistic),
    "address": "full address string"
  }
]

Include a good mix of all three types. Use real place names and realistic coordinates near the given location. Only output the JSON array, nothing else.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API error:", response.status, errText);
      throw new Error("Failed to fetch nearby places from AI");
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "[]";

    // Strip markdown code fences if present
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let places;
    try {
      places = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      places = [];
    }

    return new Response(
      JSON.stringify({ places }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Nearby places error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

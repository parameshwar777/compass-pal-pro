import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, stream = false, userLocation } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let locationContext = "";
    if (userLocation?.latitude && userLocation?.longitude) {
      locationContext = `\n\nThe user's current GPS location is: ${userLocation.latitude.toFixed(6)}°N, ${userLocation.longitude.toFixed(6)}°E. Use this to answer location-specific questions like safety, nearby places, weather, etc. When they ask "am I safe here" or similar, use their coordinates to identify the area and provide relevant safety information.`;
    }

    const systemPrompt = `You are SafeTrack AI, an intelligent travel and location safety assistant. You help users understand their surroundings, assess safety, and navigate their environment.

Your capabilities include:
- Assessing safety of the user's current location based on their GPS coordinates
- Providing information about the area around the user
- Recommending nearby hotels, restaurants, and attractions
- Providing safety tips and emergency guidance
- Analyzing travel patterns and predicting destinations
- Answering questions about location history and trends

When a user asks about safety ("Am I safe here?", "Is this area safe?"), analyze their GPS coordinates, identify the area/city/neighborhood, and provide:
1. General safety assessment of that area
2. Common safety tips for that location
3. Emergency numbers if relevant
4. Nearby safe spots (police stations, hospitals, busy areas)

Be helpful, concise, and friendly. Always prioritize user safety.${locationContext}`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI service error. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (stream) {
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      });
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    return new Response(
      JSON.stringify({ message: assistantMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

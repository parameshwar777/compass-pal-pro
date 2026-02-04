import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LocationLog {
  latitude: number;
  longitude: number;
  hour: number;
  day: number;
}

interface LocationCluster {
  lat: number;
  lng: number;
  count: number;
  label: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body - optional current location
    let currentHour = new Date().getHours();
    let currentDay = new Date().getDay();
    
    try {
      const body = await req.json();
      if (body.hour !== undefined) currentHour = body.hour;
      if (body.day !== undefined) currentDay = body.day;
    } catch {
      // Use defaults if no body
    }

    // Fetch user's location history
    const { data: locationLogs, error: logsError } = await supabase
      .from("location_logs")
      .select("latitude, longitude, hour, day")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500);

    if (logsError) {
      throw new Error(`Failed to fetch location logs: ${logsError.message}`);
    }

    if (!locationLogs || locationLogs.length < 5) {
      return new Response(
        JSON.stringify({ 
          error: "Not enough location data",
          message: "Please track more locations to enable predictions (minimum 5 data points needed)",
          dataPoints: locationLogs?.length || 0
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Simple Markov-like prediction based on time patterns
    // Group locations by day and hour
    const timePatterns: Record<string, LocationLog[]> = {};
    
    locationLogs.forEach((log: LocationLog) => {
      const key = `${log.day}-${log.hour}`;
      if (!timePatterns[key]) timePatterns[key] = [];
      timePatterns[key].push(log);
    });

    // Find matching patterns for the next hour(s)
    const predictedLocations: LocationCluster[] = [];
    
    // Look at next 3 hours
    for (let offset = 1; offset <= 3; offset++) {
      const nextHour = (currentHour + offset) % 24;
      const nextDay = nextHour < currentHour && offset === 1 ? (currentDay + 1) % 7 : currentDay;
      const key = `${nextDay}-${nextHour}`;
      
      if (timePatterns[key] && timePatterns[key].length > 0) {
        const logs = timePatterns[key];
        const avgLat = logs.reduce((sum, l) => sum + l.latitude, 0) / logs.length;
        const avgLng = logs.reduce((sum, l) => sum + l.longitude, 0) / logs.length;
        
        predictedLocations.push({
          lat: avgLat,
          lng: avgLng,
          count: logs.length,
          label: `Hour ${nextHour}:00`,
        });
      }
    }

    // Calculate most likely next location (weighted by frequency)
    let prediction = null;
    let confidence = 0;

    if (predictedLocations.length > 0) {
      // Use the highest count prediction
      const best = predictedLocations.reduce((a, b) => a.count > b.count ? a : b);
      confidence = Math.min(0.95, (best.count / locationLogs.length) * 5 + 0.3);
      
      prediction = {
        latitude: best.lat,
        longitude: best.lng,
        confidence,
        label: best.label,
        basedOnDataPoints: best.count,
      };
    } else {
      // Fallback: most common location overall
      const locationCounts: Record<string, { lat: number; lng: number; count: number }> = {};
      
      locationLogs.forEach((log: LocationLog) => {
        // Round to 4 decimal places for clustering
        const key = `${log.latitude.toFixed(4)},${log.longitude.toFixed(4)}`;
        if (!locationCounts[key]) {
          locationCounts[key] = { lat: log.latitude, lng: log.longitude, count: 0 };
        }
        locationCounts[key].count++;
      });

      const mostCommon = Object.values(locationCounts).reduce((a, b) => a.count > b.count ? a : b);
      confidence = Math.min(0.7, (mostCommon.count / locationLogs.length) * 2);

      prediction = {
        latitude: mostCommon.lat,
        longitude: mostCommon.lng,
        confidence,
        label: "Most visited location",
        basedOnDataPoints: mostCommon.count,
      };
    }

    // Save prediction to database
    const { error: insertError } = await supabase.from("predictions").insert({
      user_id: user.id,
      predicted_lat: prediction.latitude,
      predicted_lng: prediction.longitude,
      confidence: prediction.confidence,
      label: prediction.label,
      prediction_timestamp: new Date().toISOString(),
    });

    if (insertError) {
      console.error("Failed to save prediction:", insertError);
    }

    return new Response(
      JSON.stringify({
        prediction,
        totalDataPoints: locationLogs.length,
        patternMatches: predictedLocations.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Prediction error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

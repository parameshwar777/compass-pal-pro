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
  label: string | null;
  created_at: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    let currentHour = new Date().getHours();
    let currentDay = new Date().getDay();
    let currentLabel: string | null = null;

    try {
      const body = await req.json();
      if (body.hour !== undefined) currentHour = body.hour;
      if (body.day !== undefined) currentDay = body.day;
      if (body.currentLabel) currentLabel = body.currentLabel;
    } catch {
      // Use defaults
    }

    // Fetch user's location history with labels
    const { data: locationLogs, error: logsError } = await supabase
      .from("location_logs")
      .select("latitude, longitude, hour, day, label, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1000);

    if (logsError) {
      throw new Error(`Failed to fetch location logs: ${logsError.message}`);
    }

    if (!locationLogs || locationLogs.length < 3) {
      return new Response(
        JSON.stringify({
          error: "Not enough location data",
          message: "Please log more labeled locations to enable predictions (minimum 3 needed)",
          dataPoints: locationLogs?.length || 0,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build transition model: given a label, what label comes next?
    // Look at sequential logs to find label→label transitions
    const labeledLogs = locationLogs.filter((l: LocationLog) => l.label);

    if (labeledLogs.length < 2) {
      // Fall back to time-based prediction
      return timeBasedPrediction(locationLogs, currentHour, currentDay, user.id, supabase, corsHeaders);
    }

    // Build transition counts: fromLabel → {toLabel: count}
    const transitions: Record<string, Record<string, number>> = {};
    // Also build label→location mapping (average coords per label)
    const labelLocations: Record<string, { totalLat: number; totalLng: number; count: number }> = {};

    for (let i = 0; i < labeledLogs.length; i++) {
      const log = labeledLogs[i];
      const lbl = log.label!.toLowerCase().trim();

      if (!labelLocations[lbl]) {
        labelLocations[lbl] = { totalLat: 0, totalLng: 0, count: 0 };
      }
      labelLocations[lbl].totalLat += log.latitude;
      labelLocations[lbl].totalLng += log.longitude;
      labelLocations[lbl].count++;

      // Transition to next labeled log
      if (i < labeledLogs.length - 1) {
        const nextLabel = labeledLogs[i + 1].label!.toLowerCase().trim();
        if (!transitions[lbl]) transitions[lbl] = {};
        transitions[lbl][nextLabel] = (transitions[lbl][nextLabel] || 0) + 1;
      }
    }

    // If we have a current label, predict next based on transitions
    let predictedLabel: string | null = null;
    let confidence = 0;
    let transitionCount = 0;

    if (currentLabel) {
      const key = currentLabel.toLowerCase().trim();
      const nextOptions = transitions[key];

      if (nextOptions) {
        const total = Object.values(nextOptions).reduce((s, c) => s + c, 0);
        let maxCount = 0;
        let maxLabel = "";

        for (const [label, count] of Object.entries(nextOptions)) {
          if (count > maxCount) {
            maxCount = count;
            maxLabel = label;
          }
        }

        predictedLabel = maxLabel;
        confidence = Math.min(0.95, maxCount / total);
        transitionCount = total;
      }
    }

    // If no current label or no transition found, use time-of-day pattern
    if (!predictedLabel) {
      // Find what label is most common at next hour on this day
      const nextHour = (currentHour + 1) % 24;
      const relevantLogs = labeledLogs.filter(
        (l: LocationLog) => l.day === currentDay && Math.abs(l.hour - nextHour) <= 1
      );

      if (relevantLogs.length > 0) {
        const labelCounts: Record<string, number> = {};
        relevantLogs.forEach((l: LocationLog) => {
          const lbl = l.label!.toLowerCase().trim();
          labelCounts[lbl] = (labelCounts[lbl] || 0) + 1;
        });

        let maxCount = 0;
        for (const [label, count] of Object.entries(labelCounts)) {
          if (count > maxCount) {
            maxCount = count;
            predictedLabel = label;
          }
        }
        confidence = Math.min(0.85, maxCount / relevantLogs.length);
        transitionCount = relevantLogs.length;
      }
    }

    // Final fallback: most common label overall
    if (!predictedLabel) {
      const allLabelCounts: Record<string, number> = {};
      labeledLogs.forEach((l: LocationLog) => {
        const lbl = l.label!.toLowerCase().trim();
        allLabelCounts[lbl] = (allLabelCounts[lbl] || 0) + 1;
      });

      let maxCount = 0;
      for (const [label, count] of Object.entries(allLabelCounts)) {
        if (count > maxCount) {
          maxCount = count;
          predictedLabel = label;
        }
      }
      confidence = Math.min(0.6, maxCount / labeledLogs.length);
      transitionCount = labeledLogs.length;
    }

    // Get coordinates for predicted label
    const locData = predictedLabel ? labelLocations[predictedLabel] : null;
    const predLat = locData ? locData.totalLat / locData.count : 0;
    const predLng = locData ? locData.totalLng / locData.count : 0;

    // Save prediction
    await supabase.from("predictions").insert({
      user_id: user.id,
      predicted_lat: predLat,
      predicted_lng: predLng,
      confidence,
      label: predictedLabel || "Unknown",
      prediction_timestamp: new Date().toISOString(),
    });

    // Build available transitions info
    const availableTransitions = currentLabel && transitions[currentLabel.toLowerCase().trim()]
      ? Object.entries(transitions[currentLabel.toLowerCase().trim()]).map(([label, count]) => ({
          label,
          count,
          coords: labelLocations[label]
            ? {
                lat: labelLocations[label].totalLat / labelLocations[label].count,
                lng: labelLocations[label].totalLng / labelLocations[label].count,
              }
            : null,
        }))
      : [];

    return new Response(
      JSON.stringify({
        prediction: {
          latitude: predLat,
          longitude: predLng,
          confidence,
          label: predictedLabel || "Unknown",
          basedOnDataPoints: transitionCount,
        },
        totalDataPoints: locationLogs.length,
        labeledDataPoints: labeledLogs.length,
        availableLabels: Object.keys(labelLocations),
        transitions: availableTransitions,
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

// Fallback time-based prediction when no labels exist
async function timeBasedPrediction(
  locationLogs: LocationLog[],
  currentHour: number,
  currentDay: number,
  userId: string,
  supabase: any,
  corsHeaders: Record<string, string>
) {
  const timePatterns: Record<string, LocationLog[]> = {};
  locationLogs.forEach((log: LocationLog) => {
    const key = `${log.day}-${log.hour}`;
    if (!timePatterns[key]) timePatterns[key] = [];
    timePatterns[key].push(log);
  });

  const nextHour = (currentHour + 1) % 24;
  const key = `${currentDay}-${nextHour}`;
  const matches = timePatterns[key] || [];

  let prediction;
  let confidence;

  if (matches.length > 0) {
    const avgLat = matches.reduce((s, l) => s + l.latitude, 0) / matches.length;
    const avgLng = matches.reduce((s, l) => s + l.longitude, 0) / matches.length;
    confidence = Math.min(0.8, (matches.length / locationLogs.length) * 5 + 0.3);
    prediction = { latitude: avgLat, longitude: avgLng, confidence, label: `~${nextHour}:00`, basedOnDataPoints: matches.length };
  } else {
    const locationCounts: Record<string, { lat: number; lng: number; count: number }> = {};
    locationLogs.forEach((log: LocationLog) => {
      const k = `${log.latitude.toFixed(4)},${log.longitude.toFixed(4)}`;
      if (!locationCounts[k]) locationCounts[k] = { lat: log.latitude, lng: log.longitude, count: 0 };
      locationCounts[k].count++;
    });
    const best = Object.values(locationCounts).reduce((a, b) => (a.count > b.count ? a : b));
    confidence = Math.min(0.6, (best.count / locationLogs.length) * 2);
    prediction = { latitude: best.lat, longitude: best.lng, confidence, label: "Most visited", basedOnDataPoints: best.count };
  }

  await supabase.from("predictions").insert({
    user_id: userId,
    predicted_lat: prediction.latitude,
    predicted_lng: prediction.longitude,
    confidence: prediction.confidence,
    label: prediction.label,
    prediction_timestamp: new Date().toISOString(),
  });

  return new Response(
    JSON.stringify({ prediction, totalDataPoints: locationLogs.length, labeledDataPoints: 0, availableLabels: [], transitions: [] }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

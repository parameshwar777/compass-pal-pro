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

interface LabelPattern {
  totalLat: number;
  totalLng: number;
  count: number;
  hourFrequency: Record<number, number>;
  dayFrequency: Record<number, number>;
  dayHourFrequency: Record<string, number>;
}

interface TransitionInfo {
  count: number;
  dayOfWeek: Record<number, number>;
  hourOfDay: Record<number, number>;
  totalTimeDiff: number;
}

interface SequencePattern {
  sequence: string[];
  count: number;
  weekdayCount: number;
  weekendCount: number;
}

interface PredictionCandidate {
  label: string;
  confidence: number;
  method: string;
  lat: number;
  lng: number;
}

interface TouristSuggestion {
  name: string;
  type: string;
  category: string;
  latitude: number;
  longitude: number;
  rating: number;
  reason: string;
}

// Haversine distance in km
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getTimeContext(hour: number): { period: string; suggestion: string } {
  if (hour >= 6 && hour < 9) return { period: "early morning", suggestion: "breakfast spots, cafes, parks for morning walk" };
  if (hour >= 9 && hour < 12) return { period: "morning", suggestion: "cafes, tourist attractions, museums, temples" };
  if (hour >= 12 && hour < 14) return { period: "lunch time", suggestion: "restaurants, food courts, local eateries, biryani places" };
  if (hour >= 14 && hour < 17) return { period: "afternoon", suggestion: "shopping malls, tourist spots, monuments, parks" };
  if (hour >= 17 && hour < 20) return { period: "evening", suggestion: "restaurants for dinner, street food, entertainment, movies" };
  if (hour >= 20 && hour < 23) return { period: "night", suggestion: "restaurants, dessert places, night markets, lounges" };
  return { period: "late night", suggestion: "24hr restaurants, hotels, late-night cafes" };
}

async function getTouristSuggestions(lat: number, lng: number, hour: number): Promise<TouristSuggestion[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY not configured for tourist mode");
    return [];
  }

  const timeCtx = getTimeContext(hour);

  const prompt = `You are a local travel guide. Given GPS coordinates (${lat}, ${lng}) and the current time is ${timeCtx.period} (around ${hour}:00), suggest 5-8 REAL nearby places that would be most relevant right now.

Focus on: ${timeCtx.suggestion}

Return ONLY a JSON array, no extra text:
[
  {
    "name": "Real Place Name",
    "type": "restaurant" | "cafe" | "attraction" | "park" | "mall" | "temple" | "entertainment",
    "category": "specific category like South Indian Restaurant, Historical Fort, etc",
    "latitude": number (realistic nearby coordinate),
    "longitude": number (realistic nearby coordinate),
    "rating": number (1-5),
    "reason": "Why this is good to visit right now at ${timeCtx.period}"
  }
]

Use REAL place names near these coordinates. Keep within 10km radius.`;

  try {
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
      console.error("AI API error for tourist mode:", response.status);
      return [];
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "[]";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    return JSON.parse(content);
  } catch (err) {
    console.error("Tourist suggestion error:", err);
    return [];
  }
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
      return new Response(JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let currentHour = new Date().getHours();
    let currentDay = new Date().getDay();
    let currentLabel: string | null = null;
    let currentLat: number | null = null;
    let currentLng: number | null = null;

    try {
      const body = await req.json();
      if (body.hour !== undefined) currentHour = body.hour;
      if (body.day !== undefined) currentDay = body.day;
      if (body.currentLabel) currentLabel = body.currentLabel;
      if (body.latitude !== undefined) currentLat = body.latitude;
      if (body.longitude !== undefined) currentLng = body.longitude;
    } catch { /* use defaults */ }

    const isWeekday = currentDay >= 1 && currentDay <= 5;

    // Fetch location history
    const { data: locationLogs, error: logsError } = await supabase
      .from("location_logs")
      .select("latitude, longitude, hour, day, label, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(2000);

    if (logsError) throw new Error(`Failed to fetch location logs: ${logsError.message}`);

    const labeledLogs = (locationLogs || []).filter((l: LocationLog) => l.label);

    // === TOURIST MODE DETECTION ===
    // If user has no label set AND their current coords don't match any known labeled place (>1km away from all),
    // they're in "tourist mode" - suggest nearby places based on time of day
    let isTouristMode = false;
    const KNOWN_PLACE_RADIUS_KM = 1.0;

    if (!currentLabel && currentLat !== null && currentLng !== null && labeledLogs.length > 0) {
      // Build label averages
      const labelAvgs: Record<string, { lat: number; lng: number; count: number }> = {};
      for (const log of labeledLogs) {
        const lbl = log.label!.toLowerCase().trim();
        if (!labelAvgs[lbl]) labelAvgs[lbl] = { lat: 0, lng: 0, count: 0 };
        labelAvgs[lbl].lat += log.latitude;
        labelAvgs[lbl].lng += log.longitude;
        labelAvgs[lbl].count++;
      }

      let nearestKnownDist = Infinity;
      let nearestLabel: string | null = null;
      for (const [lbl, avg] of Object.entries(labelAvgs)) {
        const avgLat = avg.lat / avg.count;
        const avgLng = avg.lng / avg.count;
        const dist = haversineKm(currentLat, currentLng, avgLat, avgLng);
        if (dist < nearestKnownDist) {
          nearestKnownDist = dist;
          nearestLabel = lbl;
        }
      }

      if (nearestKnownDist > KNOWN_PLACE_RADIUS_KM) {
        // User is far from all known places → tourist mode
        isTouristMode = true;
      } else if (nearestLabel) {
        // Auto-detect current label from proximity
        currentLabel = nearestLabel;
      }
    }

    // Also tourist mode if no labeled logs at all but user has coordinates
    if (labeledLogs.length < 2 && currentLat !== null && currentLng !== null) {
      isTouristMode = true;
    }

    // === TOURIST MODE RESPONSE ===
    if (isTouristMode && currentLat !== null && currentLng !== null) {
      const timeCtx = getTimeContext(currentHour);
      const suggestions = await getTouristSuggestions(currentLat, currentLng, currentHour);

      // Save a tourist-mode prediction
      if (suggestions.length > 0) {
        await supabase.from("predictions").insert({
          user_id: user.id,
          predicted_lat: suggestions[0].latitude,
          predicted_lng: suggestions[0].longitude,
          confidence: 0.7,
          label: suggestions[0].name,
          prediction_method: `Tourist mode: ${timeCtx.period} suggestions`,
          prediction_timestamp: new Date().toISOString(),
        });
      }

      return new Response(JSON.stringify({
        mode: "tourist",
        prediction: {
          label: suggestions.length > 0 ? suggestions[0].name : `Explore ${timeCtx.suggestion}`,
          latitude: suggestions.length > 0 ? suggestions[0].latitude : currentLat,
          longitude: suggestions.length > 0 ? suggestions[0].longitude : currentLng,
          confidence: 0.7,
          method: `Tourist mode: ${timeCtx.period} - ${timeCtx.suggestion}`,
          basedOnDataPoints: labeledLogs.length,
          alternativePredictions: suggestions.slice(1, 4).map(s => ({
            label: s.name,
            latitude: s.latitude,
            longitude: s.longitude,
            confidence: 0.65,
            reason: s.reason,
          })),
        },
        touristSuggestions: suggestions,
        context: {
          currentTime: `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][currentDay]} ${currentHour}:00`,
          isWeekday,
          currentLabel: null,
          timePeriod: timeCtx.period,
          suggestionType: timeCtx.suggestion,
        },
        insights: {
          weekdayPattern: [],
          weekendPattern: [],
          commonSequences: [],
          topTransitions: [],
        },
        stats: {
          totalDataPoints: locationLogs?.length || 0,
          labeledDataPoints: labeledLogs.length,
          uniqueLabels: 0,
          sequencesLearned: 0,
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === REGULAR CHAIN-BASED PREDICTION ===
    if (!locationLogs || locationLogs.length < 3) {
      return new Response(JSON.stringify({
        error: "Not enough location data",
        message: "Please log more labeled locations to enable predictions (minimum 3 needed)",
        dataPoints: locationLogs?.length || 0,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (labeledLogs.length < 2) {
      return new Response(JSON.stringify({
        error: "Not enough location data",
        message: "Please log at least 2 labeled locations to enable predictions",
        dataPoints: locationLogs.length,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === Step 1: Build label patterns ===
    const labelPatterns: Record<string, LabelPattern> = {};
    for (const log of labeledLogs) {
      const lbl = log.label!.toLowerCase().trim();
      if (!labelPatterns[lbl]) {
        labelPatterns[lbl] = { totalLat: 0, totalLng: 0, count: 0, hourFrequency: {}, dayFrequency: {}, dayHourFrequency: {} };
      }
      const p = labelPatterns[lbl];
      p.totalLat += log.latitude;
      p.totalLng += log.longitude;
      p.count++;
      p.hourFrequency[log.hour] = (p.hourFrequency[log.hour] || 0) + 1;
      p.dayFrequency[log.day] = (p.dayFrequency[log.day] || 0) + 1;
      const dhKey = `${log.day}-${log.hour}`;
      p.dayHourFrequency[dhKey] = (p.dayHourFrequency[dhKey] || 0) + 1;
    }

    const getLabelCoords = (lbl: string) => {
      const p = labelPatterns[lbl];
      return p ? { lat: p.totalLat / p.count, lng: p.totalLng / p.count } : { lat: 0, lng: 0 };
    };

    // === Step 2: Build transitions ===
    const transitions: Record<string, Record<string, TransitionInfo>> = {};
    for (let i = 0; i < labeledLogs.length - 1; i++) {
      const from = labeledLogs[i].label!.toLowerCase().trim();
      const to = labeledLogs[i + 1].label!.toLowerCase().trim();
      if (from === to) continue;

      if (!transitions[from]) transitions[from] = {};
      if (!transitions[from][to]) {
        transitions[from][to] = { count: 0, dayOfWeek: {}, hourOfDay: {}, totalTimeDiff: 0 };
      }
      const t = transitions[from][to];
      t.count++;
      t.dayOfWeek[labeledLogs[i].day] = (t.dayOfWeek[labeledLogs[i].day] || 0) + 1;
      t.hourOfDay[labeledLogs[i].hour] = (t.hourOfDay[labeledLogs[i].hour] || 0) + 1;
      const timeDiff = new Date(labeledLogs[i + 1].created_at).getTime() - new Date(labeledLogs[i].created_at).getTime();
      t.totalTimeDiff += timeDiff;
    }

    // === Step 3: Build sequences (length 3-5) ===
    const sequenceCounts: Record<string, SequencePattern> = {};
    for (let seqLen = 3; seqLen <= Math.min(5, labeledLogs.length); seqLen++) {
      for (let i = 0; i <= labeledLogs.length - seqLen; i++) {
        const seq = labeledLogs.slice(i, i + seqLen).map(l => l.label!.toLowerCase().trim());
        if (seq.some((s, idx) => idx > 0 && s === seq[idx - 1])) continue;
        const key = seq.join(" → ");
        if (!sequenceCounts[key]) {
          sequenceCounts[key] = { sequence: seq, count: 0, weekdayCount: 0, weekendCount: 0 };
        }
        sequenceCounts[key].count++;
        const day = labeledLogs[i].day;
        if (day >= 1 && day <= 5) sequenceCounts[key].weekdayCount++;
        else sequenceCounts[key].weekendCount++;
      }
    }

    const significantSequences = Object.values(sequenceCounts).filter(s => s.count >= 2);
    significantSequences.sort((a, b) => b.count - a.count);

    // === Step 4: Generate predictions ===
    const candidates: PredictionCandidate[] = [];
    const normalizedCurrent = currentLabel?.toLowerCase().trim() || null;

    // Method 1: Sequence-based
    if (normalizedCurrent) {
      for (const sp of significantSequences) {
        const idx = sp.sequence.lastIndexOf(normalizedCurrent);
        if (idx >= 0 && idx < sp.sequence.length - 1) {
          const nextLabel = sp.sequence[idx + 1];
          const dayMatch = isWeekday ? sp.weekdayCount / Math.max(1, sp.count) : sp.weekendCount / Math.max(1, sp.count);
          const confidence = Math.min(0.95, (sp.count / 20) * dayMatch + 0.5);
          const coords = getLabelCoords(nextLabel);
          candidates.push({ label: nextLabel, confidence, method: `Sequence pattern: ${sp.sequence.join(" → ")}`, lat: coords.lat, lng: coords.lng });
        }
      }
    }

    // Method 2: Transition-based
    if (normalizedCurrent && transitions[normalizedCurrent]) {
      const fromTransitions = transitions[normalizedCurrent];
      const totalFromCount = Object.values(fromTransitions).reduce((s, t) => s + t.count, 0);
      for (const [toLabel, info] of Object.entries(fromTransitions)) {
        let confidence = Math.min(0.9, info.count / totalFromCount + 0.3);
        const dayBoost = (info.dayOfWeek[currentDay] || 0) / Math.max(1, info.count);
        confidence = Math.min(0.9, confidence + dayBoost * 0.1);
        const hourBoost = (info.hourOfDay[currentHour] || 0) / Math.max(1, info.count);
        confidence = Math.min(0.9, confidence + hourBoost * 0.1);
        const coords = getLabelCoords(toLabel);
        candidates.push({ label: toLabel, confidence, method: `Transition: ${normalizedCurrent} → ${toLabel} (${info.count} times)`, lat: coords.lat, lng: coords.lng });
      }
    }

    // Method 3: Time pattern (day+hour)
    const nextHour = (currentHour + 1) % 24;
    const timeKey = `${currentDay}-${nextHour}`;
    const timeKeyCurrent = `${currentDay}-${currentHour}`;
    const timeLabelCounts: Record<string, number> = {};
    let totalTimeMatches = 0;
    for (const [lbl, pattern] of Object.entries(labelPatterns)) {
      const count = (pattern.dayHourFrequency[timeKey] || 0) + (pattern.dayHourFrequency[timeKeyCurrent] || 0);
      if (count > 0) { timeLabelCounts[lbl] = count; totalTimeMatches += count; }
    }
    for (const [lbl, count] of Object.entries(timeLabelCounts)) {
      const confidence = Math.min(0.85, count / totalTimeMatches + 0.2);
      const coords = getLabelCoords(lbl);
      candidates.push({ label: lbl, confidence, method: `Time pattern: ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][currentDay]} ~${currentHour}:00`, lat: coords.lat, lng: coords.lng });
    }

    // Method 4: Day pattern
    const dayPatternCounts: Record<string, number> = {};
    let totalDayMatches = 0;
    for (const [lbl, pattern] of Object.entries(labelPatterns)) {
      let score = 0;
      if (isWeekday) { for (let d = 1; d <= 5; d++) score += (pattern.dayFrequency[d] || 0); }
      else { score += (pattern.dayFrequency[0] || 0) + (pattern.dayFrequency[6] || 0); }
      if (score > 0) { dayPatternCounts[lbl] = score; totalDayMatches += score; }
    }
    for (const [lbl, score] of Object.entries(dayPatternCounts)) {
      const confidence = Math.min(0.75, score / (totalDayMatches * 10) + 0.3);
      const coords = getLabelCoords(lbl);
      candidates.push({ label: lbl, confidence, method: `Day pattern: ${isWeekday ? "Weekday" : "Weekend"} routine`, lat: coords.lat, lng: coords.lng });
    }

    // === Step 5: Rank and deduplicate ===
    const bestByLabel: Record<string, PredictionCandidate> = {};
    for (const c of candidates) {
      if (!bestByLabel[c.label] || c.confidence > bestByLabel[c.label].confidence) {
        bestByLabel[c.label] = c;
      }
    }

    const ranked = Object.values(bestByLabel).sort((a, b) => b.confidence - a.confidence);

    if (ranked.length === 0) {
      let maxLbl = "";
      let maxCount = 0;
      for (const [lbl, p] of Object.entries(labelPatterns)) {
        if (p.count > maxCount) { maxCount = p.count; maxLbl = lbl; }
      }
      const coords = getLabelCoords(maxLbl);
      ranked.push({ label: maxLbl, confidence: Math.min(0.5, maxCount / labeledLogs.length), method: "Most visited location", lat: coords.lat, lng: coords.lng });
    }

    const primary = ranked[0];
    const alternatives = ranked.slice(1, 4);

    // Save prediction
    await supabase.from("predictions").insert({
      user_id: user.id,
      predicted_lat: primary.lat,
      predicted_lng: primary.lng,
      confidence: primary.confidence,
      label: primary.label,
      prediction_method: primary.method,
      prediction_timestamp: new Date().toISOString(),
    });

    // Build insights
    const weekdayPattern: { label: string; count: number }[] = [];
    const weekendPattern: { label: string; count: number }[] = [];
    for (const [lbl, p] of Object.entries(labelPatterns)) {
      let wdCount = 0, weCount = 0;
      for (let d = 1; d <= 5; d++) wdCount += (p.dayFrequency[d] || 0);
      weCount += (p.dayFrequency[0] || 0) + (p.dayFrequency[6] || 0);
      if (wdCount > 0) weekdayPattern.push({ label: lbl, count: wdCount });
      if (weCount > 0) weekendPattern.push({ label: lbl, count: weCount });
    }
    weekdayPattern.sort((a, b) => b.count - a.count);
    weekendPattern.sort((a, b) => b.count - a.count);

    const topTransitions: { from: string; to: string; frequency: number }[] = [];
    for (const [from, tos] of Object.entries(transitions)) {
      for (const [to, info] of Object.entries(tos)) {
        topTransitions.push({ from, to, frequency: info.count });
      }
    }
    topTransitions.sort((a, b) => b.frequency - a.frequency);

    const commonSequences = significantSequences.slice(0, 5).map(s => ({
      sequence: s.sequence.join(" → "),
      frequency: s.count,
    }));

    return new Response(JSON.stringify({
      mode: "routine",
      prediction: {
        label: primary.label,
        latitude: primary.lat,
        longitude: primary.lng,
        confidence: primary.confidence,
        method: primary.method,
        basedOnDataPoints: labeledLogs.length,
        alternativePredictions: alternatives.map(a => ({
          label: a.label, latitude: a.lat, longitude: a.lng, confidence: a.confidence, reason: a.method,
        })),
      },
      context: {
        currentTime: `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][currentDay]} ${currentHour}:00`,
        isWeekday,
        currentLabel: normalizedCurrent,
      },
      insights: {
        weekdayPattern: weekdayPattern.slice(0, 5),
        weekendPattern: weekendPattern.slice(0, 5),
        commonSequences,
        topTransitions: topTransitions.slice(0, 5),
      },
      stats: {
        totalDataPoints: locationLogs.length,
        labeledDataPoints: labeledLogs.length,
        uniqueLabels: Object.keys(labelPatterns).length,
        sequencesLearned: significantSequences.length,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Prediction error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

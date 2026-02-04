import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Contact {
  name: string;
  email: string;
  phone: string;
}

interface SOSRequest {
  contacts: Contact[];
  location: string;
  coordinates: { lat: number; lng: number } | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { contacts, location, coordinates }: SOSRequest = await req.json();

    if (!contacts || contacts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No contacts provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailContacts = contacts.filter((c) => c.email);
    if (emailContacts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No contacts with email addresses" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mapLink = coordinates 
      ? `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`
      : location;

    const emailPromises = emailContacts.map(async (contact) => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "SafeTrack SOS <onboarding@resend.dev>",
          to: [contact.email],
          subject: "🚨 EMERGENCY SOS ALERT - Immediate Attention Required",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0f; color: #ffffff;">
              <div style="background: linear-gradient(135deg, #dc2626, #991b1b); padding: 30px; border-radius: 16px; text-align: center; margin-bottom: 20px;">
                <h1 style="margin: 0; font-size: 28px; color: #ffffff;">🚨 EMERGENCY ALERT</h1>
                <p style="margin: 10px 0 0; font-size: 16px; color: rgba(255,255,255,0.9);">Someone needs your help immediately</p>
              </div>
              
              <div style="background-color: #1a1a2e; padding: 24px; border-radius: 12px; border: 1px solid #2d2d44;">
                <p style="margin: 0 0 16px; font-size: 16px; color: #e5e5e5;">
                  Dear ${contact.name},
                </p>
                <p style="margin: 0 0 20px; font-size: 16px; color: #e5e5e5;">
                  This is an <strong style="color: #ef4444;">emergency SOS alert</strong> from SafeTrack. The user has triggered an emergency signal and may need immediate assistance.
                </p>
                
                <div style="background-color: #0d0d15; padding: 20px; border-radius: 12px; margin: 20px 0;">
                  <h3 style="margin: 0 0 12px; font-size: 14px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Location</h3>
                  ${coordinates ? `
                    <p style="margin: 0 0 8px; font-size: 16px; color: #e5e5e5;">
                      📍 ${coordinates.lat.toFixed(6)}°, ${coordinates.lng.toFixed(6)}°
                    </p>
                  ` : ''}
                  <a href="${mapLink}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #6366f1); color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 10px;">
                    📍 View on Google Maps
                  </a>
                </div>
                
                <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #dc2626;">
                  <p style="margin: 0; font-size: 14px; color: #991b1b;">
                    <strong>Please take immediate action:</strong><br>
                    • Try to contact the person directly<br>
                    • If unreachable, consider contacting local emergency services<br>
                    • Check the location link above for their last known position
                  </p>
                </div>
              </div>
              
              <p style="text-align: center; font-size: 12px; color: #6b7280; margin-top: 20px;">
                This alert was sent via SafeTrack Emergency SOS system.
              </p>
            </body>
            </html>
          `,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`Failed to send email to ${contact.email}:`, error);
        return { email: contact.email, success: false, error };
      }

      return { email: contact.email, success: true };
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter((r) => r.success).length;

    console.log(`SOS alerts sent: ${successCount}/${emailContacts.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        total: emailContacts.length,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("SOS function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

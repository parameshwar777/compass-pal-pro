import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OTPRequest {
  email: string;
  otp: string;
  type: "signup" | "login";
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

    const { email, otp, type }: OTPRequest = await req.json();

    if (!email || !otp) {
      return new Response(
        JSON.stringify({ error: "Email and OTP are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subject = type === "signup" 
      ? "Welcome to SafeTrack - Verify Your Email" 
      : "SafeTrack Login Verification Code";

    const heading = type === "signup"
      ? "Welcome to SafeTrack! 🎉"
      : "Login Verification";

    const message = type === "signup"
      ? "Thank you for signing up! Please use the verification code below to complete your registration."
      : "Use the verification code below to complete your login.";

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SafeTrack <onboarding@resend.dev>",
        to: [email],
        subject,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0f; color: #ffffff;">
            <div style="background: linear-gradient(135deg, #8b5cf6, #6366f1); padding: 30px; border-radius: 16px; text-align: center; margin-bottom: 20px;">
              <h1 style="margin: 0; font-size: 28px; color: #ffffff;">📍 SafeTrack</h1>
              <p style="margin: 10px 0 0; font-size: 16px; color: rgba(255,255,255,0.9);">AI Location Intelligence</p>
            </div>
            
            <div style="background-color: #1a1a2e; padding: 24px; border-radius: 12px; border: 1px solid #2d2d44;">
              <h2 style="margin: 0 0 16px; font-size: 22px; color: #e5e5e5;">${heading}</h2>
              <p style="margin: 0 0 24px; font-size: 16px; color: #a1a1aa;">
                ${message}
              </p>
              
              <div style="background: linear-gradient(135deg, #1e1e30, #252540); padding: 24px; border-radius: 12px; text-align: center; margin: 20px 0;">
                <p style="margin: 0 0 8px; font-size: 14px; color: #9ca3af; text-transform: uppercase; letter-spacing: 2px;">Your verification code</p>
                <div style="font-size: 40px; font-weight: 700; letter-spacing: 8px; color: #8b5cf6; font-family: monospace;">
                  ${otp}
                </div>
              </div>
              
              <p style="margin: 20px 0 0; font-size: 14px; color: #71717a; text-align: center;">
                This code will expire in 10 minutes.<br>
                If you didn't request this code, please ignore this email.
              </p>
            </div>
            
            <p style="text-align: center; font-size: 12px; color: #6b7280; margin-top: 20px;">
              © ${new Date().getFullYear()} SafeTrack. All rights reserved.
            </p>
          </body>
          </html>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to send OTP email:", error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const data = await response.json();
    console.log("OTP email sent successfully:", data);

    return new Response(
      JSON.stringify({ success: true, message: "OTP sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("OTP function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

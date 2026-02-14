import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, User, MapPin, Eye, EyeOff, ArrowRight, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");

  const { signIn } = useAuth();
  const navigate = useNavigate();

  const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSignUp = async () => {
    if (!email || !password || !name) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      // Generate OTP and send via email
      const code = generateOtp();
      setGeneratedOtp(code);

      const { error } = await supabase.functions.invoke("send-otp", {
        body: { email, otp: code, type: "signup" },
      });

      if (error) {
        console.error("OTP send error:", error);
        toast.error("Failed to send verification code. Please try again.");
        return;
      }

      setOtpStep(true);
      toast.success("Verification code sent to your email!");
    } catch (err) {
      console.error("Signup error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp !== generatedOtp) {
      toast.error("Invalid verification code. Please try again.");
      return;
    }

    setLoading(true);
    try {
      // OTP verified - now create the account
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, email_verified: true },
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      // Try to sign in immediately
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        toast.success("Account created! Please sign in.");
        setIsLogin(true);
        setOtpStep(false);
        setOtp("");
      } else {
        toast.success("Welcome to SafeTrack!");
        navigate("/");
      }
    } catch (err) {
      console.error("Verify error:", err);
      toast.error("Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Welcome back!");
        navigate("/");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpStep) {
      await handleVerifyOtp();
    } else if (isLogin) {
      await handleLogin();
    } else {
      await handleSignUp();
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const code = generateOtp();
      setGeneratedOtp(code);
      await supabase.functions.invoke("send-otp", {
        body: { email, otp: code, type: "signup" },
      });
      toast.success("New code sent!");
    } catch {
      toast.error("Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background pointer-events-none" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-4 shadow-glow"
          >
            <MapPin className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground">SafeTrack</h1>
          <p className="text-muted-foreground text-sm">AI Location Intelligence</p>
        </div>

        {/* Auth Card */}
        <Card variant="glass" className="border-border/50">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">
              {otpStep ? "Verify Email" : isLogin ? "Welcome Back" : "Create Account"}
            </CardTitle>
            <CardDescription>
              {otpStep
                ? `Enter the 6-digit code sent to ${email}`
                : isLogin
                  ? "Sign in to access your dashboard"
                  : "Start tracking your journeys today"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {otpStep ? (
                <>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="pl-10 h-12 bg-secondary border-border text-center text-lg tracking-widest"
                      maxLength={6}
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-sm text-muted-foreground"
                    onClick={handleResendOtp}
                    disabled={loading}
                  >
                    Didn't receive? Resend code
                  </Button>
                </>
              ) : (
                <>
                  {!isLogin && (
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Full Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10 h-12 bg-secondary border-border"
                        required={!isLogin}
                      />
                    </div>
                  )}

                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 bg-secondary border-border"
                      required
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-12 bg-secondary border-border"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </>
              )}

              <Button
                type="submit"
                variant="gradient"
                className="w-full h-12 text-base"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    {otpStep ? "Verifying..." : isLogin ? "Signing in..." : "Sending code..."}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {otpStep ? "Verify & Create Account" : isLogin ? "Sign In" : "Send Verification Code"}
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </Button>
            </form>

            {!otpStep && (
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                  <button
                    onClick={() => { setIsLogin(!isLogin); setOtpStep(false); setOtp(""); }}
                    className="text-accent hover:underline font-medium"
                  >
                    {isLogin ? "Sign Up" : "Sign In"}
                  </button>
                </p>
              </div>
            )}

            {otpStep && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => { setOtpStep(false); setOtp(""); }}
                  className="text-sm text-accent hover:underline"
                >
                  ← Back to signup
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

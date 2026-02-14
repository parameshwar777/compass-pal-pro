import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, MapPin, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/hooks/useLocation";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const quickActions = [
  { label: "Am I safe here?", icon: Shield },
  { label: "Where will I go next?", icon: MapPin },
  { label: "Nearby restaurants", icon: Sparkles },
];

export function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm SafeTrack AI, your location safety assistant. I can tell you if your area is safe, suggest nearby places, and help with travel questions. Try asking **\"Am I safe here?\"**",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { currentLocation } = useLocation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput("");
    setIsTyping(true);

    try {
      const messageHistory = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      messageHistory.push({ role: "user", content: userInput });

      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          messages: messageHistory,
          stream: false,
          userLocation: currentLocation
            ? { latitude: currentLocation.latitude, longitude: currentLocation.longitude }
            : null,
        },
      });

      if (error) throw new Error(error.message || "Failed to get response");
      if (data?.error) throw new Error(data.error);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data?.message || "I'm sorry, I couldn't generate a response.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Chat error: ${errorMsg}`);

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Sorry, I encountered an error: ${errorMsg}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
  };

  const clearChat = () => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content: "Hello! I'm SafeTrack AI, your location safety assistant. I can tell you if your area is safe, suggest nearby places, and help with travel questions. Try asking **\"Am I safe here?\"**",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-foreground">SafeTrack AI</h2>
              <p className="text-[10px] text-muted-foreground">
                {currentLocation ? `📍 ${currentLocation.latitude.toFixed(3)}°, ${currentLocation.longitude.toFixed(3)}°` : "Location-aware assistant"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={clearChat} className="text-muted-foreground h-8 w-8">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={cn("flex gap-2", message.role === "user" ? "flex-row-reverse" : "")}
            >
              <div
                className={cn(
                  "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center",
                  message.role === "user" ? "bg-accent" : "bg-gradient-primary"
                )}
              >
                {message.role === "user" ? (
                  <User className="w-3.5 h-3.5 text-accent-foreground" />
                ) : (
                  <Bot className="w-3.5 h-3.5 text-primary-foreground" />
                )}
              </div>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2",
                  message.role === "user"
                    ? "bg-accent text-accent-foreground rounded-tr-sm"
                    : "bg-card border border-border rounded-tl-sm"
                )}
              >
                {message.role === "assistant" ? (
                  <div className="text-sm leading-relaxed prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed">{message.content}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex gap-2"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-3 py-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      <div className="flex-shrink-0 px-3 pb-1">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="glass"
              size="sm"
              className="flex-shrink-0 gap-1.5 h-7 text-[10px]"
              onClick={() => handleQuickAction(action.label)}
            >
              <action.icon className="w-3 h-3" />
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-3 border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask about safety, places..."
            className="flex-1 h-10 px-3 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
          />
          <Button
            variant="gradient"
            size="icon"
            className="rounded-xl h-10 w-10"
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

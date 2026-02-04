import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Map, MessageSquare, AlertTriangle, Brain, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: Map, label: "Map" },
  { path: "/predictions", icon: Brain, label: "Predict" },
  { path: "/sos", icon: AlertTriangle, label: "SOS" },
  { path: "/assistant", icon: MessageSquare, label: "Chat" },
  { path: "/profile", icon: User, label: "Profile" },
];

export function BottomNavigation() {
  const location = useLocation();

  return (
    <nav className="shrink-0 border-t border-border bg-card safe-bottom">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          const isSOS = item.path === "/sos";

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center gap-0.5 px-3 py-1"
            >
              <motion.div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-xl transition-colors",
                  isActive 
                    ? isSOS ? "bg-sos/20" : "bg-accent/20" 
                    : "hover:bg-muted"
                )}
                whileTap={{ scale: 0.9 }}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isActive 
                      ? isSOS ? "text-sos" : "text-accent" 
                      : "text-muted-foreground"
                  )}
                />
              </motion.div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  isActive 
                    ? isSOS ? "text-sos" : "text-accent" 
                    : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className={cn(
                    "absolute -top-0.5 w-1 h-1 rounded-full",
                    isSOS ? "bg-sos" : "bg-accent"
                  )}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

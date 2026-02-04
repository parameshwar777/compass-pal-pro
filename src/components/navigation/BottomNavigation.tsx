import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Map, MessageSquare, User, AlertTriangle, Brain, Hotel } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: Map, label: "Map" },
  { path: "/predictions", icon: Brain, label: "Predict" },
  { path: "/stays", icon: Hotel, label: "Stays" },
  { path: "/sos", icon: AlertTriangle, label: "SOS" },
  { path: "/assistant", icon: MessageSquare, label: "AI Chat" },
  { path: "/profile", icon: User, label: "Profile" },
];

export function BottomNavigation() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 safe-bottom">
      <div className="mx-4 mb-4">
        <div className="glass-card rounded-2xl px-2 py-3">
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              const isSOS = item.path === "/sos";

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className="relative flex flex-col items-center gap-1 px-4 py-1"
                >
                  <motion.div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-xl transition-colors duration-200",
                      isActive 
                        ? isSOS ? "bg-sos/20" : "bg-accent/20" 
                        : isSOS ? "hover:bg-sos/10" : "hover:bg-accent/10"
                    )}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5 transition-colors duration-200",
                        isActive 
                          ? isSOS ? "text-sos" : "text-accent" 
                          : isSOS ? "text-sos/70" : "text-muted-foreground"
                      )}
                    />
                  </motion.div>
                  <span
                    className={cn(
                      "text-2xs font-medium transition-colors duration-200",
                      isActive 
                        ? isSOS ? "text-sos" : "text-accent" 
                        : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className={cn(
                        "absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
                        isSOS ? "bg-sos" : "bg-accent"
                      )}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

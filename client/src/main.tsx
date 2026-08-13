import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import SupabaseConfigError from "@/components/SupabaseConfigError";
import { AuthProvider } from "@/contexts/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isSupabaseConfigured() ? (
      <AuthProvider>
        <App />
      </AuthProvider>
    ) : (
      <SupabaseConfigError />
    )}
  </StrictMode>,
);

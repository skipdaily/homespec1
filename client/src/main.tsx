import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { supabase } from "./lib/supabase";

// Simple connection check
console.log("Testing Supabase connection...");

createRoot(document.getElementById("root")!).render(<App />);

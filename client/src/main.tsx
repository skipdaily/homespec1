import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { testSupabaseConnection } from "@/lib/supabase";

testSupabaseConnection();

createRoot(document.getElementById("root")!).render(<App />);

// FORCE GIT PUSH - VERCEL DEPLOYMENT FIX - 2025-08-20
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const el = document.getElementById("root");
if (!el) throw new Error("Root element #root not found");
createRoot(el).render(<App />);

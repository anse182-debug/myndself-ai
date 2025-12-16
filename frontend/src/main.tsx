// src/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from "./App";
import Landing from "./Landing";
import TermsPage from "./Terms";    // 👈 AGGIUNGI QUESTO
import PrivacyPage from "./Privacy"; // 👈 AGGIUNGI QUESTO
import Investors from "./Investors";


import "./styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<App />} />
        <Route path="/terms" element={<TermsPage />} />     {/* 👈 QUI */}
        <Route path="/privacy" element={<PrivacyPage />} /> {/* 👈 QUI */}
        <Route path="/investors" element={<Investors />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";


const App = () => (
  <BrowserRouter>
    <Toaster />
    <Sonner />
    <Routes>
      <Route path="/" element={<Index />} />
    </Routes>
  </BrowserRouter>
);

export default App;

import { Toaster } from "@/components/ui/toaster";
import { BrowserRouter, Routes, Route } from "react-router";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";


const App = () => (
  <BrowserRouter>
    <Toaster />
    <Routes>
      <Route index element={<Index />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;

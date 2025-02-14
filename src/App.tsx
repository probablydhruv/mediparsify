import { Toaster } from "@/components/ui/toaster";
import { Outlet } from "react-router";

const App = () => (
  <>
    <Toaster />
    <Outlet />
  </>
);

export default App;

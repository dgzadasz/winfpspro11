import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Checkout from "./pages/Checkout";
import PremiumAI from "./pages/PremiumAI";
import Cart from "./pages/Cart";

function Router() {
  return <Switch><Route path="/" component={Home} /><Route path="/cart" component={Cart} /><Route path="/checkout/:plan" component={Checkout} /><Route path="/premium-ai" component={PremiumAI} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

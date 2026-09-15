import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
const Checkout = lazy(() => import("./pages/Checkout"));
const PremiumAI = lazy(() => import("./pages/PremiumAI"));
const Cart = lazy(() => import("./pages/Cart"));
const Catalog = lazy(() => import("./pages/Catalog"));
const Product = lazy(() => import("./pages/Product"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Reviews = lazy(() => import("./pages/Reviews"));
const Support = lazy(() => import("./pages/Support"));

function Router() {
  return <Switch><Route path="/" component={Home} /><Route path="/catalog" component={Catalog} /><Route path="/product/:slug" component={Product} /><Route path="/dashboard" component={Dashboard} /><Route path="/support" component={Support} /><Route path="/reviews" component={Reviews} /><Route path="/cart" component={Cart} /><Route path="/checkout/:plan" component={Checkout} /><Route path="/premium-ai" component={PremiumAI} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster /><Suspense fallback={<main className="dashboard-page"><p className="dashboard-content" role="status">Carregando página…</p></main>}><Router /></Suspense></TooltipProvider></ThemeProvider></ErrorBoundary>;
}


import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import Compare from "./pages/Compare";
import Pricing from "./pages/Pricing";
import Activate from "./pages/Activate";
import Info from "./pages/Info";
import Report from "./pages/Report";
import Admin from "./pages/Admin";
import SiteShell from "./components/SiteShell";

function Router() { return <Switch><Route path="/" component={Home} /><Route path="/search" component={Search} /><Route path="/profile/:username" component={Profile} /><Route path="/report/:username" component={Report} /><Route path="/dashboard" component={Dashboard} /><Route path="/compare" component={Compare} /><Route path="/pricing" component={Pricing} /><Route path="/activate" component={Activate} /><Route path="/admin" component={Admin} /><Route path="/about" component={Info} /><Route path="/privacy" component={Info} /><Route path="/terms" component={Info} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>; }
export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><SiteShell><Router /></SiteShell></TooltipProvider></ThemeProvider></ErrorBoundary>; }

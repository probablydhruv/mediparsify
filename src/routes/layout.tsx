import { ArrowRight, Brain, Clock, Shield, Sparkles } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router";

export default function Component() {
    return (
        <div className="min-h-screen bg-background">
            {/* Navbar, move to own component for dynamism later */}
            <nav className="fixed w-full bg-background/80 backdrop-blur-sm z-50 border-b">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="text-2xl font-semibold text-primary">
                        <NavLink to="/">TOMOHealth</NavLink>
                    </div>
                    <NavLink to="about">About</NavLink>
                    <NavLink to="app" className="flex items-center gap-2">
                        Get Started <ArrowRight className="w-4 h-4" />
                    </NavLink>
                </div>

            </nav>
            <div className="pt-20 pb-20 px-4">
                <Outlet />
            </div>

            {/* Footer */}
            <footer className="bg-muted py-8">
                <div className="container mx-auto px-4 text-center text-muted-foreground">
                    <hr />
                    <p>&copy; 2025 TOMOHealth. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};
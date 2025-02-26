import { ArrowRight, Brain, Clock, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router";

export default function Component() {
    return (
        <>
            {/* Hero Section */}
            <section>
                <div className="container mx-auto text-center">
                    <div className="max-w-3xl mx-auto animate-fade-up">
                        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium inline-block mb-4">
                            Simplifying Healthcare Understanding
                        </span>
                        <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
                            Your Medical Reports,{" "}
                            <span className="text-primary">Finally Clear</span>
                        </h1>
                        <p className="text-muted-foreground text-lg md:text-xl mb-8 leading-relaxed">
                            Transform complex medical jargon into clear, actionable insights.
                            Access your complete health history in one secure place.
                        </p>
                        <Button size="lg" className="animate-fade-in">
                            Start Your Health Journey
                        </Button>
                    </div>
                </div>
            </section>
            {/* Features Section */}
            <section>
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Card className="p-6 hover:shadow-lg transition-shadow bg-background">
                            <Brain className="w-12 h-12 text-primary mb-4" />
                            <h3 className="text-xl font-semibold mb-2">
                                Smart Report Translation
                            </h3>
                            <p className="text-muted-foreground">
                                Instantly convert medical terminology into plain, understandable
                                language you can act on.
                            </p>
                        </Card>
                        <Card className="p-6 hover:shadow-lg transition-shadow bg-background">
                            <Clock className="w-12 h-12 text-primary mb-4" />
                            <h3 className="text-xl font-semibold mb-2">
                                Unified Health Timeline
                            </h3>
                            <p className="text-muted-foreground">
                                Access your complete medical history in one place, organized
                                chronologically for better understanding.
                            </p>
                        </Card>
                        <Card className="p-6 hover:shadow-lg transition-shadow bg-background">
                            <Shield className="w-12 h-12 text-primary mb-4" />
                            <h3 className="text-xl font-semibold mb-2">
                                Secure Data Protection
                            </h3>
                            <p className="text-muted-foreground">
                                Your health data is encrypted and protected with top grade
                                security protocols, not to mention we dont save any of it.
                            </p>
                        </Card>
                    </div>
                </div>
            </section>
            {/* CTA Section */}
            <section className="py-10">
                <div className="container mx-auto px-4 text-center">
                    <div className="max-w-2xl mx-auto">
                        <Sparkles className="w-12 h-12 text-primary mx-auto mb-6" />
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">
                            Ready to Take Control of Your Health Journey?
                        </h2>
                        <p className="text-muted-foreground mb-8">
                            Join hundreads of users who have already simplified their healthcare
                            experience with TOMOHealth.
                        </p>
                    </div>
                </div>
            </section>
        </>

    );
};
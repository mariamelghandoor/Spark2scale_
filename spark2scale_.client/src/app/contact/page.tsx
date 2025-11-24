"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, MessageSquare, Send } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: "",
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Contact form submitted:", formData);
        // Handle form submission
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold text-[#576238]">Contact Us</h1>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-8"
                    >
                        <h2 className="text-4xl font-bold text-[#576238] mb-3">
                            Get in Touch
                        </h2>
                        <p className="text-lg text-muted-foreground">
                            Have questions? We'd love to hear from you.
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Contact Form */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Card className="border-2">
                                <CardHeader>
                                    <CardTitle className="text-[#576238]">
                                        Send us a Message
                                    </CardTitle>
                                    <CardDescription>
                                        Fill out the form and we'll get back to you soon
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Name</Label>
                                            <Input
                                                id="name"
                                                placeholder="Your name"
                                                value={formData.name}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, name: e.target.value })
                                                }
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="your@email.com"
                                                value={formData.email}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, email: e.target.value })
                                                }
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="subject">Subject</Label>
                                            <Input
                                                id="subject"
                                                placeholder="What's this about?"
                                                value={formData.subject}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, subject: e.target.value })
                                                }
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="message">Message</Label>
                                            <Textarea
                                                id="message"
                                                placeholder="Tell us more..."
                                                rows={5}
                                                value={formData.message}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, message: e.target.value })
                                                }
                                                required
                                            />
                                        </div>

                                        <Button
                                            type="submit"
                                             className="w-full bg-[#576238] hover:bg-[#6b7c3f]"
                                            size="lg"
                                        >
                                            <Send className="mr-2 h-4 w-4" />
                                            Send Message
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Contact Info */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="space-y-6"
                        >
                            <Card className="border-2 hover:border-[#FFD95D] transition-all">
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-[#FFD95D]/20 flex items-center justify-center flex-shrink-0">
                                            <Mail className="h-6 w-6 text-[#576238]" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-[#576238] mb-1">
                                                Email Us
                                            </h3>
                                            <p className="text-sm text-muted-foreground mb-2">
                                                Get in touch via email
                                            </p>
                                            <a
                                                href="mailto:hello@spark2scale.com"
                                                className="text-sm text-[#576238] hover:underline"
                                            >
                                                hello@spark2scale.com
                                            </a>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-2 hover:border-[#FFD95D] transition-all">
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-[#FFD95D]/20 flex items-center justify-center flex-shrink-0">
                                            <MessageSquare className="h-6 w-6 text-[#576238]" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-[#576238] mb-1">
                                                Live Chat
                                            </h3>
                                            <p className="text-sm text-muted-foreground mb-2">
                                                Chat with our team
                                            </p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-[#576238] text-[#576238]"
                                            >
                                                Start Chat
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-2 bg-gradient-to-br from-[#576238] to-[#6b7c3f] text-white">
                                <CardContent className="p-6">
                                    <h3 className="font-semibold text-lg mb-2">
                                        Ready to Build?
                                    </h3>
                                    <p className="text-sm text-white/80 mb-4">
                                        Join hundreds of founders and investors using our platform
                                    </p>
                                    <Link href="/signup">
                                        <Button
                                            className="w-full bg-[#FFD95D] hover:bg-[#ffe89a] text-black"
                                            size="lg"
                                        >
                                            Get Started Free
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </main>
        </div>
    );
}
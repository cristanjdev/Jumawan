"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle, Github, Linkedin, Twitter, Facebook, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useContactStore } from "@/stores/useContactStore";

import { cn } from "@/lib/utils";

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

export function ContactSection() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const { isSubmitting, submitStatus, submitMessage, resetStatus } = useContactStore();

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required";
    } else if (formData.subject.trim().length < 5) {
      newErrors.subject = "Subject must be at least 5 characters";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    } else if (formData.message.trim().length < 10) {
      newErrors.message = "Message must be at least 10 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const success = await submitMessage({
      name: formData.name.trim(),
      email: formData.email.trim(),
      subject: formData.subject.trim(),
      message: formData.message.trim(),
    });

    if (success) {
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    }

    setTimeout(() => resetStatus(), 5000);
  };

  const contactInfo = [
    {
      icon: Mail,
      label: "Email",
      value: "cristanjade14@gmail.com",
      href: "mailto:cristanjade14@gmail.com",
      color: "text-cyan-400"
    },
    {
      icon: Phone,
      label: "Phone",
      value: "+639617110582",
      href: "tel:+639617110582",
      color: "text-purple-400"
    },
    {
      icon: MapPin,
      label: "Location",
      value: "Zone 2-A Looc, Igpit Opol Misamis Oriental",
      href: "#",
      color: "text-pink-400"
    },
  ];

  const socialLinks = [
    { icon: Github, label: "GitHub", href: "https://github.com/cristanjdev", color: "hover:text-white" },
    { icon: Linkedin, label: "LinkedIn", href: "https://www.linkedin.com/in/cristan-jade-jumawan-45b27b39b", color: "hover:text-blue-400" },
    { icon: Twitter, label: "Twitter", href: "https://twitter.com/cristanjade", color: "hover:text-sky-400" },
    { icon: Facebook, label: "Facebook", href: "https://facebook.com/yourprofile", color: "hover:text-blue-600" },
    { icon: Instagram, label: "Instagram", href: "https://instagram.com/yourprofile", color: "hover:text-pink-500" },
  ];

  return (
    <section id="contact" className="py-24 relative overflow-hidden flex items-center justify-center min-h-[100svh] border-none outline-none">
      {/* Background Elements */}
      {/* Background Elements removed for seamless integration with global galaxy background */}

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-[clamp(1.5rem,7.2vw,2.25rem)] md:text-5xl lg:text-6xl font-bold text-cyan-400 mb-6">
              Let's Start a Conversation
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg font-medium">
              Have a project in mind or just want to say hi? I'm always open to discussing new projects, creative ideas or opportunities to be part of your visions.
            </p>
          </motion.div>

          <div className="relative">
            {/* Desktop: Grid for overlapping layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

              {/* Form Section - Spans 7 cols on desktop */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 1.2 }}
                viewport={{ once: true }}
                className="lg:col-span-7 relative z-10"
              >
                <div className="border border-border/50 rounded-xl p-5 sm:p-8 md:p-10 relative overflow-hidden transition-all duration-500 ease-in-out hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                  {/* Glass Reflection */}
                  <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-3xl pointer-events-none" />

                  <form onSubmit={handleSubmit} className="space-y-6 relative">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground ml-1">Your Name</label>
                        <Input
                          placeholder="John Doe"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className={cn(
                            "bg-muted/10 border-border/20 h-12 rounded-xl focus:bg-muted/15 focus:border-primary/50 transition-all",
                            errors.name && "border-destructive/50"
                          )}
                        />
                        {errors.name && <p className="text-destructive text-xs ml-1">{errors.name}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground ml-1">Your Email</label>
                        <Input
                          placeholder="john@example.com"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className={cn(
                            "bg-muted/10 border-border/20 h-12 rounded-xl focus:bg-muted/15 focus:border-primary/50 transition-all",
                            errors.email && "border-destructive/50"
                          )}
                        />
                        {errors.email && <p className="text-destructive text-xs ml-1">{errors.email}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground ml-1">Subject</label>
                      <Input
                        placeholder="Project Collaboration"
                        value={formData.subject}
                        onChange={(e) => handleInputChange('subject', e.target.value)}
                        className={cn(
                          "bg-muted/10 border-border/20 h-12 rounded-xl focus:bg-muted/15 focus:border-primary/50 transition-all",
                          errors.subject && "border-destructive/50"
                        )}
                      />
                      {errors.subject && <p className="text-destructive text-xs ml-1">{errors.subject}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground ml-1">Message</label>
                      <Textarea
                        placeholder="Tell me about your project..."
                        rows={6}
                        value={formData.message}
                        onChange={(e) => handleInputChange('message', e.target.value)}
                        className={cn(
                          "bg-muted/10 border-border/20 rounded-xl focus:bg-muted/15 focus:border-primary/50 transition-all resize-none",
                          errors.message && "border-destructive/50"
                        )}
                      />
                      {errors.message && <p className="text-destructive text-xs ml-1">{errors.message}</p>}
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-14 bg-gradient-to-r from-primary to-accent hover:opacity-90 rounded-xl text-lg font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <span className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                          Sending...
                        </span>
                      ) : submitStatus === 'success' ? (
                        <span className="flex items-center gap-2 text-white">
                          <CheckCircle className="w-5 h-5" />
                          Sent Successfully!
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Send Message <Send className="w-4 h-4" />
                        </span>
                      )}
                    </Button>
                    {submitStatus === 'error' && (
                      <p role="alert" className="flex items-center justify-center gap-2 text-destructive text-sm">
                        <AlertCircle className="w-4 h-4" />
                        Your message couldn't be sent. Please try again or email me directly.
                      </p>
                    )}
                  </form>
                </div>
              </motion.div>

              {/* Info Section - Spans 5 cols, Overlaps on Desktop */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: true }}
                className="lg:col-span-5 lg:absolute lg:right-0 lg:top-0 lg:bottom-0 lg:w-[40%] text-left z-20 flex flex-col justify-center pointer-events-none"
              >
                {/* 
                  Wrapper div for the card content to enable pointer events 
                  (parent has pointer-events-none to let clicks pass through to form if needed, though here strictly layout side-by-side/overlap) 
                  Actually, we want the info card to be interactive.
                */}
                <div className="border border-border/50 p-5 sm:p-8 md:p-10 rounded-xl pointer-events-auto h-full flex flex-col justify-center transition-all duration-500 ease-in-out hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(34,211,238,0.1)]">

                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Contact Information</h3>

                  <div className="space-y-5 sm:space-y-8">
                    {contactInfo.map((info, idx) => (
                      <a
                        key={idx}
                        href={info.href}
                        className="block group transition-all duration-300 hover:translate-x-2"
                      >
                        <div className="flex items-center gap-2 sm:gap-2.5">
                          <info.icon className={cn("w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0", info.color)} />
                          <p className="text-xs sm:text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">{info.label}</p>
                        </div>
                        <p className="mt-2 text-sm sm:text-lg text-white font-medium break-words" title={info.value}>{info.value}</p>
                      </a>
                    ))}
                  </div>

                  <div className="mt-8 sm:mt-12">
                    <h4 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3 sm:mb-4">Follow Me</h4>
                    <div className="flex flex-wrap gap-2.5 sm:gap-3">
                      {socialLinks.map((social, idx) => (
                        <a
                          key={idx}
                          href={social.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn("p-2.5 sm:p-3 rounded-lg bg-muted/10 border border-border/10 text-muted-foreground transition-all hover:scale-110", social.color)}
                          title={social.label}
                        >
                          <social.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

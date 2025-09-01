"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Test if CSS is working */}
        <div className="bg-red-500 text-white p-4 mb-4 rounded">
          CSS Test: If you see this red box, Tailwind CSS is working!
        </div>
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            SMM Web Booster Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Professional Social Media Marketing Services
          </p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Boost your social media presence with our reliable and affordable services. 
            Get real followers, likes, and engagement for Twitter, Instagram, TikTok, and more.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">🚀 Fast Delivery</CardTitle>
              <CardDescription>
                Get your orders completed quickly with our automated system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Most orders start within minutes and complete within hours
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">💎 High Quality</CardTitle>
              <CardDescription>
                Real followers and engagement from active users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                We provide high-quality services with real accounts and engagement
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">💰 Best Prices</CardTitle>
              <CardDescription>
                Competitive pricing with 10% markup on premium services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Get the best value for your money with our transparent pricing
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Button
            onClick={() => router.push("/auth/signin")}
            size="lg"
            className="text-lg px-8 py-3"
          >
            Get Started Now
          </Button>
        </div>
      </div>
    </div>
  );
}

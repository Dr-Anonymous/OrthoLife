import React, { useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PostComposer from '@/components/social-media/PostComposer';
import SocialMetrics from '@/components/social-media/SocialMetrics';
import { Share2, BarChart2 } from 'lucide-react';

const SocialMediaManager = () => {
    // Ensure we start at the top of the page
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50/50 flex flex-col">
            <Header />

            <main className="flex-1 pt-24 pb-16 px-4 md:px-6 container mx-auto max-w-7xl animate-fade-in">

                <div className="mb-8 p-6 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 md:items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Social Media Manager</h1>
                        <p className="text-gray-500 max-w-2xl">
                            Manage OrthoLife's online presence. Compose standard posts, schedule them ahead of time, and track your engagement analytics across all platforms.
                        </p>
                    </div>
                    <div className="hidden md:flex flex-row-reverse -space-x-3 space-x-reverse opacity-80">
                        <div className="w-10 h-10 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm z-10">GBP</div>
                        <div className="w-10 h-10 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm z-20">FB</div>
                        <div className="w-10 h-10 rounded-full border-2 border-white bg-pink-100 flex items-center justify-center text-pink-600 shadow-sm z-30">IG</div>
                        <div className="w-10 h-10 rounded-full border-2 border-white bg-sky-100 flex items-center justify-center text-sky-600 shadow-sm z-40">X</div>
                    </div>
                </div>

                <Tabs defaultValue="compose" className="w-full">
                    <TabsList className="grid w-full max-w-md grid-cols-2 mb-8 bg-white/50 backdrop-blur-md border border-gray-200/60 p-1 h-12 shadow-sm">
                        <TabsTrigger value="compose" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-white transition-all data-[state=active]:shadow-md">
                            <div className="flex items-center gap-2 font-medium">
                                <Share2 size={16} />
                                <span>Composer</span>
                            </div>
                        </TabsTrigger>
                        <TabsTrigger value="metrics" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-white transition-all data-[state=active]:shadow-md">
                            <div className="flex items-center gap-2 font-medium">
                                <BarChart2 size={16} />
                                <span>Analytics</span>
                            </div>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="compose" className="mt-0 focus-visible:outline-none focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <PostComposer />
                    </TabsContent>

                    <TabsContent value="metrics" className="mt-0 focus-visible:outline-none focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SocialMetrics />
                    </TabsContent>
                </Tabs>

            </main>

            <Footer />
        </div>
    );
};

export default SocialMediaManager;

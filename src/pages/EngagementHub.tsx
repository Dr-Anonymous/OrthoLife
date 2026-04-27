import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PostComposer from '@/components/social-media/PostComposer';
import SocialMetrics from '@/components/social-media/SocialMetrics';
import ScheduledTasksList from '@/components/social-media/ScheduledTasksList';
import WhatsAppComposer from '@/components/social-media/WhatsAppComposer';
import { Share2, BarChart2, ListTodo, MessageSquare } from 'lucide-react';

const EngagementHub = () => {
    const { pathname } = useLocation();
    
    // Ensure we start at the top of the page
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const defaultTab = pathname === '/smm' ? 'social' : 'whatsapp';

    return (
        <div className="min-h-screen bg-gray-50/50 flex flex-col">
            <Header />

            <main className="flex-1 pt-24 pb-16 px-4 md:px-6 container mx-auto max-w-7xl animate-fade-in">

                <div className="mb-8 p-6 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 md:items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Engagement Hub</h1>
                        <p className="text-gray-500 max-w-2xl">
                            Manage all your communications in one place. Schedule WhatsApp messages and social posts, or send them immediately to stay connected.
                        </p>
                    </div>
                    <div className="hidden md:flex flex-row-reverse -space-x-3 space-x-reverse opacity-80">
                        <div className="w-10 h-10 rounded-full border-2 border-white bg-green-100 flex items-center justify-center text-green-600 shadow-sm z-10 font-bold text-xs">WA</div>
                        <div className="w-10 h-10 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm z-20 font-bold text-xs">GBP</div>
                        <div className="w-10 h-10 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm z-30 font-bold text-xs">FB</div>
                        <div className="w-10 h-10 rounded-full border-2 border-white bg-pink-100 flex items-center justify-center text-pink-600 shadow-sm z-40 font-bold text-xs">IG</div>
                    </div>
                </div>

                <Tabs defaultValue={defaultTab} className="w-full">
                    <TabsList className="grid w-full max-w-3xl grid-cols-4 mb-8 bg-white/50 backdrop-blur-md border border-gray-200/60 p-1 h-12 shadow-sm">
                        <TabsTrigger value="whatsapp" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-white transition-all data-[state=active]:shadow-md">
                            <div className="flex items-center gap-2 font-medium">
                                <MessageSquare size={16} />
                                <span>WhatsApp</span>
                            </div>
                        </TabsTrigger>
                        <TabsTrigger value="social" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-white transition-all data-[state=active]:shadow-md">
                            <div className="flex items-center gap-2 font-medium">
                                <Share2 size={16} />
                                <span>Social Posts</span>
                            </div>
                        </TabsTrigger>
                        <TabsTrigger value="queue" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-white transition-all data-[state=active]:shadow-md">
                            <div className="flex items-center gap-2 font-medium">
                                <ListTodo size={16} />
                                <span>Schedule Queue</span>
                            </div>
                        </TabsTrigger>
                        <TabsTrigger value="metrics" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-white transition-all data-[state=active]:shadow-md">
                            <div className="flex items-center gap-2 font-medium">
                                <BarChart2 size={16} />
                                <span>Analytics</span>
                            </div>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="whatsapp" className="mt-0 focus-visible:outline-none focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <WhatsAppComposer />
                    </TabsContent>

                    <TabsContent value="social" className="mt-0 focus-visible:outline-none focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <PostComposer />
                    </TabsContent>

                    <TabsContent value="queue" className="mt-0 focus-visible:outline-none focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <ScheduledTasksList />
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

export default EngagementHub;

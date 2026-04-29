import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from "@/lib/utils";
import PostComposer from '@/components/social-media/PostComposer';
import SocialMetrics from '@/components/social-media/SocialMetrics';
import ScheduledTasksList from '@/components/social-media/ScheduledTasksList';
import WhatsAppComposer from '@/components/social-media/WhatsAppComposer';
import { Share2, BarChart2, ListTodo, MessageSquare } from 'lucide-react';
import { useConsultant } from '@/context/ConsultantContext';

const EngagementHub = () => {
    const { pathname } = useLocation();

    const { consultant, refreshConsultant } = useConsultant();

    // Ensure we start at the top of the page
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);



    const defaultTabValue = pathname === '/smm' ? 'social' : 'whatsapp';
    const [activeTab, setActiveTab] = useState(defaultTabValue);
    const [seenTabs, setSeenTabs] = useState<Set<string>>(new Set([defaultTabValue]));

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        setSeenTabs(prev => {
            const next = new Set(prev);
            next.add(value);
            return next;
        });
    };

    return (
        <div className="min-h-screen bg-gray-50/50 flex flex-col">
            <Header />

            <main className="flex-1 pt-24 pb-16 px-4 md:px-6 container mx-auto max-w-7xl animate-fade-in">

                <div className="mb-10 text-center">
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 mb-3">Engagement Hub</h1>
                    <p className="text-sm md:text-base text-gray-500 max-w-2xl mx-auto leading-relaxed font-medium">
                        Manage all your communications in one place. Schedule WhatsApp messages and social posts, or send them immediately to stay connected.
                    </p>
                </div>

                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <div className="flex justify-center mb-10">
                        <TabsList className="flex md:grid w-full max-w-3xl md:grid-cols-4 bg-white/50 backdrop-blur-md border border-gray-200/60 p-1.5 h-auto md:h-14 shadow-lg rounded-2xl overflow-x-auto scrollbar-hide">
                            <TabsTrigger value="whatsapp" className="flex-1 min-w-[100px] md:min-w-0 rounded-xl py-3 md:py-1 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300 data-[state=active]:shadow-lg">
                                <div className="flex items-center gap-2 font-bold">
                                    <MessageSquare size={18} className="shrink-0" />
                                    <span className="whitespace-nowrap">WhatsApp</span>
                                </div>
                            </TabsTrigger>
                            <TabsTrigger value="social" className="flex-1 min-w-[70px] md:min-w-0 rounded-xl py-3 md:py-1 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300 data-[state=active]:shadow-lg px-2 md:px-4">
                                <div className="flex items-center gap-1.5 md:gap-2 font-bold">
                                    <Share2 size={16} className="shrink-0" />
                                    <span className="whitespace-nowrap text-xs md:text-sm">Social<span className="hidden md:inline"> Posts</span></span>
                                </div>
                            </TabsTrigger>
                            <TabsTrigger value="queue" className="flex-1 min-w-[70px] md:min-w-0 rounded-xl py-3 md:py-1 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300 data-[state=active]:shadow-lg px-2 md:px-4">
                                <div className="flex items-center gap-1.5 md:gap-2 font-bold">
                                    <ListTodo size={16} className="shrink-0" />
                                    <span className="whitespace-nowrap text-xs md:text-sm">Queue<span className="hidden md:inline"> Tasks</span></span>
                                </div>
                            </TabsTrigger>
                            <TabsTrigger value="metrics" className="flex-1 min-w-[70px] md:min-w-0 rounded-xl py-3 md:py-1 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300 data-[state=active]:shadow-lg px-2 md:px-4">
                                <div className="flex items-center gap-1.5 md:gap-2 font-bold">
                                    <BarChart2 size={16} className="shrink-0" />
                                    <span className="whitespace-nowrap text-xs md:text-sm">Stats<span className="hidden md:inline"> & Analytics</span></span>
                                </div>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className={cn(activeTab === 'whatsapp' ? "block" : "hidden")}>
                        <div className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <WhatsAppComposer />
                        </div>
                    </div>
                    <div className={cn(activeTab === 'social' ? "block" : "hidden")}>
                        <div className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <PostComposer />
                        </div>
                    </div>
                    <div className={cn(activeTab === 'queue' ? "block" : "hidden")}>
                        <div className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {seenTabs.has('queue') && <ScheduledTasksList />}
                        </div>
                    </div>
                    <div className={cn(activeTab === 'metrics' ? "block" : "hidden")}>
                        <div className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {seenTabs.has('metrics') && <SocialMetrics />}
                        </div>
                    </div>
                </Tabs>

            </main>

            <Footer />
        </div>
    );
};

export default EngagementHub;

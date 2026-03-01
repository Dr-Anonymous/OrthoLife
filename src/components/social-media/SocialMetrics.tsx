import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Facebook, Instagram, Twitter, MapPin, TrendingUp, Users, Eye, MessageCircle, Share2, MousePointerClick } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

const STATS = [
    { label: 'Total Reach', value: '45.2K', change: '+12%', icon: Eye, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { label: 'Total Engagement', value: '8.4K', change: '+5%', icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Link Clicks', value: '1,240', change: '+18%', icon: MousePointerClick, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'New Followers', value: '342', change: '-2%', icon: TrendingUp, color: 'text-rose-500', bg: 'bg-rose-50', isNegative: true },
];

const PLATFORM_METRICS = [
    {
        id: 'gbp',
        name: 'Google Business',
        icon: MapPin,
        color: 'text-blue-600',
        metrics: { views: '12K', clicks: '450', calls: '125', directions: '89' },
        performance: 85
    },
    {
        id: 'facebook',
        name: 'Facebook',
        icon: Facebook,
        color: 'text-blue-500',
        metrics: { reach: '18K', likes: '2.1K', comments: '156', shares: '45' },
        performance: 72
    },
    {
        id: 'instagram',
        name: 'Instagram',
        icon: Instagram,
        color: 'text-pink-600',
        metrics: { reach: '22K', likes: '4.5K', comments: '342', saves: '189' },
        performance: 94
    },
    {
        id: 'twitter',
        name: 'Twitter',
        icon: Twitter,
        color: 'text-sky-500',
        metrics: { impressions: '8.5K', retweets: '12', likes: '145', replies: '8' },
        performance: 45
    },
];

const RECENT_POSTS = [
    {
        id: 1,
        content: 'Dr. Anonymous discusses the latest advancements in minimally invasive knee replacement surgery. Schedule your consultation today! #OrthoLife #JointReplacement',
        date: 'Today, 10:00 AM',
        platforms: [Facebook, Instagram, MapPin],
        engagement: 'High'
    },
    {
        id: 2,
        content: 'Tips for maintaining healthy bones as you age. Remember to get your daily calcium and vitamin D! 🥛☀️ #BoneHealth',
        date: 'Yesterday, 2:30 PM',
        platforms: [Facebook, Twitter, Instagram],
        engagement: 'Medium'
    },
    {
        id: 3,
        content: 'We are extending our weekend clinic hours to better serve you! View our updated schedule on our website. ⏰',
        date: 'Mar 1, 9:15 AM',
        platforms: [MapPin, Facebook, Twitter],
        engagement: 'Very High'
    }
];

const SocialMetrics = () => {
    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-10">

            {/* Top Level Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {STATS.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={i} className="shadow-sm border-gray-100 border transition-all hover:shadow-md">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={cn("p-2 rounded-lg", stat.bg)}>
                                        <Icon className={cn("w-5 h-5", stat.color)} />
                                    </div>
                                    <div className={cn(
                                        "flex flex-col items-end text-sm font-semibold",
                                        stat.isNegative ? "text-red-600" : "text-green-600"
                                    )}>
                                        <span>{stat.change}</span>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
                                    <div className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Platform Breakdown */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-bold text-gray-800 px-1">Platform Performance</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {PLATFORM_METRICS.map((platform) => {
                            const Icon = platform.icon;
                            return (
                                <Card key={platform.id} className="shadow-sm border-gray-100 overflow-hidden">
                                    <CardHeader className="p-4 pb-2 bg-gray-50/50 flex flex-row items-center justify-between border-b border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <Icon className={cn("w-5 h-5", platform.color)} />
                                            <CardTitle className="text-base font-semibold">{platform.name}</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4">
                                        <div className="grid grid-cols-2 gap-y-4 gap-x-2 mb-4">
                                            {Object.entries(platform.metrics).map(([key, value]) => (
                                                <div key={key}>
                                                    <p className="text-xs text-gray-500 uppercase font-medium tracking-wider">{key}</p>
                                                    <p className="text-lg font-bold text-gray-900">{value}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-4">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-gray-500">Health Score</span>
                                                <span className="font-medium text-gray-700">{platform.performance}/100</span>
                                            </div>
                                            <Progress value={platform.performance} className="h-1.5" />
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>

                {/* Recent Posts Performance */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-800 px-1">Recent Posts</h2>
                    <div className="space-y-3">
                        {RECENT_POSTS.map((post) => (
                            <Card key={post.id} className="shadow-sm border-gray-100 hover:border-primary/20 transition-colors">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex -space-x-1">
                                            {post.platforms.map((Icon, idx) => (
                                                <div key={idx} className="bg-white rounded-full p-1 border shadow-sm z-10 relative">
                                                    <Icon className="w-3 h-3 text-gray-600" />
                                                </div>
                                            ))}
                                        </div>
                                        <span className="text-xs text-gray-400 font-medium">{post.date}</span>
                                    </div>

                                    <p className="text-sm text-gray-700 line-clamp-3 mb-3 leading-relaxed">
                                        {post.content}
                                    </p>

                                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                        <div className="flex items-center gap-3 text-gray-400">
                                            <div className="flex items-center gap-1 hover:text-primary cursor-pointer transition-colors">
                                                <MessageCircle size={14} /> <span className="text-xs">React</span>
                                            </div>
                                            <div className="flex items-center gap-1 hover:text-primary cursor-pointer transition-colors">
                                                <Share2 size={14} /> <span className="text-xs">Retry</span>
                                            </div>
                                        </div>
                                        <span className={cn(
                                            "text-xs px-2 py-1 rounded-full font-medium",
                                            post.engagement === 'Very High' ? "bg-green-100 text-green-700" :
                                                post.engagement === 'High' ? "bg-emerald-100 text-emerald-700" :
                                                    "bg-blue-100 text-blue-700"
                                        )}>
                                            {post.engagement} Impact
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SocialMetrics;

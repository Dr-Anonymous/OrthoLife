import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Facebook, Instagram, Twitter, MapPin, Image as ImageIcon, Calendar as CalendarIcon, Send } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { socialService } from '@/utils/socialService';

const PLATFORMS = [
    { id: 'gbp', name: 'Google Business', icon: MapPin, color: 'text-blue-600' },
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-500' },
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-600' },
    { id: 'twitter', name: 'Twitter', icon: Twitter, color: 'text-sky-500' },
];

const PostComposer = () => {
    const [content, setContent] = useState('');
    const [selectedPlatforms, setSelectedPlatforms] = useState<Record<string, boolean>>(() => {
        const saved = localStorage.getItem('smm_selected_platforms');
        return saved ? JSON.parse(saved) : {
            gbp: true,
            facebook: true,
            instagram: true,
            twitter: true,
        };
    });
    const [scheduledDate, setScheduledDate] = useState<Date>();

    // Persist platforms to localStorage
    React.useEffect(() => {
        localStorage.setItem('smm_selected_platforms', JSON.stringify(selectedPlatforms));
    }, [selectedPlatforms]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mediaFiles, setMediaFiles] = useState<{ file: File; preview: string }[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Cleanup object URLs on unmount
    React.useEffect(() => {
        return () => {
            mediaFiles.forEach(m => URL.revokeObjectURL(m.preview));
        };
    }, [mediaFiles]);

    const handlePlatformToggle = (platformId: string) => {
        setSelectedPlatforms(prev => ({
            ...prev,
            [platformId]: !prev[platformId]
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const newMedia = files.map(file => ({
                file,
                preview: URL.createObjectURL(file)
            }));
            setMediaFiles(prev => [...prev, ...newMedia]);
        }
    };

    const removeMedia = (index: number) => {
        setMediaFiles(prev => {
            const newMedia = [...prev];
            URL.revokeObjectURL(newMedia[index].preview);
            newMedia.splice(index, 1);
            return newMedia;
        });
    };

    const handlePost = async () => {
        const activePlatforms = Object.entries(selectedPlatforms)
            .filter(([_, isActive]) => isActive)
            .map(([id]) => id);

        if (activePlatforms.length === 0) {
            toast.error('Please select at least one platform.');
            return;
        }

        if (!content.trim() && mediaFiles.length === 0) {
            toast.error('Please enter content or select media for your post.');
            return;
        }

        setIsSubmitting(true);

        try {
            await socialService.publishAll({
                content,
                platforms: activePlatforms,
                scheduledDate,
                // In a real scenario, you'd upload these files to storage first (S3/Supabase)
                // then pass the public URLs here. Instagram requires raw URLs.
                mediaUrls: mediaFiles.map(m => m.preview)
            });

            if (scheduledDate) {
                toast.success(`Post scheduled successfully!`);
            } else {
                toast.success('Post published successfully to selected platforms!');
            }

            // Reset form
            setContent('');
            setScheduledDate(undefined);
            setMediaFiles(prev => {
                prev.forEach(m => URL.revokeObjectURL(m.preview));
                return [];
            });
        } catch (err: any) {
            toast.error(err.message || 'Failed to post. Check consolidation console for details.');
            console.error('Social Media error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="w-full max-w-4xl mx-auto shadow-sm border-gray-100">
            <CardHeader>
                <CardTitle className="text-2xl font-semibold text-gray-800">Compose Post</CardTitle>
                <CardDescription>Create a post to publish across multiple social media platforms simultaneously.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Platform Selection */}
                <div className="space-y-3">
                    <Label className="text-base font-medium">Select Platforms</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {PLATFORMS.map((platform) => {
                            const Icon = platform.icon;
                            const isSelected = selectedPlatforms[platform.id];

                            return (
                                <div
                                    key={platform.id}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                                        isSelected
                                            ? "border-primary bg-primary/5 shadow-sm"
                                            : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50 text-gray-400"
                                    )}
                                    onClick={() => handlePlatformToggle(platform.id)}
                                >
                                    <div className="flex w-full justify-end mb-2">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => handlePlatformToggle(platform.id)}
                                            className="data-[state=checked]:bg-primary"
                                        />
                                    </div>
                                    <Icon className={cn("h-8 w-8 mb-2", isSelected ? platform.color : "text-gray-400")} />
                                    <span className={cn("text-sm font-medium", isSelected ? "text-gray-900" : "text-gray-500")}>
                                        {platform.name}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Post Content */}
                <div className="space-y-3">
                    <Label className="text-base font-medium">Post Content</Label>
                    <div className="relative">
                        <Textarea
                            placeholder="What do you want to share with your audience?..."
                            className="min-h-[150px] resize-y p-4 text-base rounded-xl border-gray-200 focus-visible:ring-primary/20"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />

                        {/* Media Preview Area */}
                        {mediaFiles.length > 0 && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 p-3 bg-white border-x border-gray-200">
                                {mediaFiles.map((media, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-100 group">
                                        <img src={media.preview} alt="preview" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => removeMedia(idx)}
                                            className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4.293 4.293a1  1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Action Bar inside textarea area */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 border border-t-0 rounded-b-xl border-gray-200 text-gray-500">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileChange}
                                    multiple
                                    accept="image/*"
                                />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 gap-2 text-gray-600 hover:text-primary hover:bg-primary/10"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <ImageIcon size={16} />
                                    <span>Add Media</span>
                                </Button>

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="sm" className={cn(
                                            "h-8 gap-2",
                                            scheduledDate ? "text-primary font-medium" : "text-gray-600 hover:text-primary hover:bg-primary/10"
                                        )}>
                                            <CalendarIcon size={16} />
                                            {scheduledDate ? format(scheduledDate, 'PPP') : 'Schedule'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={scheduledDate}
                                            onSelect={setScheduledDate}
                                            initialFocus
                                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                        />
                                        {scheduledDate && (
                                            <div className="p-3 border-t">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => setScheduledDate(undefined)}
                                                >
                                                    Clear Schedule
                                                </Button>
                                            </div>
                                        )}
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="text-xs text-gray-400">
                                {content.length} / 2200
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="flex justify-end pt-4 pb-6 border-t border-gray-50 mt-4">
                <Button
                    size="lg"
                    onClick={handlePost}
                    disabled={isSubmitting}
                    className="px-8 font-medium gap-2 rounded-full shadow-md hover:shadow-lg transition-all"
                >
                    {isSubmitting ? (
                        <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                        <Send size={18} />
                    )}
                    {scheduledDate ? 'Schedule Post' : 'Publish Now'}
                </Button>
            </CardFooter>
        </Card>
    );
};

export default PostComposer;

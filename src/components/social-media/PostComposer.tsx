import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Facebook, Instagram, MapPin, Image as ImageIcon, Calendar as CalendarIcon, Send, RefreshCcw, Landmark } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { socialService, type SocialPlatform, type GBPLocation } from '@/utils/socialService';

type SelectedPlatforms = Record<SocialPlatform, boolean>;
type MediaFile = { file: File; preview: string };

const PLATFORMS: PlatformConfig[] = [
  { id: 'gbp', name: 'Google Business', icon: MapPin, color: 'text-blue-600' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-600', note: 'Can auto-post to Personal Facebook' },
];

type PlatformConfig = {
  id: SocialPlatform;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  note?: string;
};

const DEFAULT_SHARE_URL = 'https://ortho.life'; // Fallback URL for Share Dialog

const DEFAULT_PLATFORMS: SelectedPlatforms = {
  gbp: true,
  instagram: true,
};

const parseStoredPlatforms = (): SelectedPlatforms => {
  const saved = localStorage.getItem('smm_selected_platforms');
  if (!saved) return DEFAULT_PLATFORMS;

  try {
    const parsed = JSON.parse(saved) as Partial<SelectedPlatforms>;
    return {
      gbp: parsed.gbp ?? true,
      instagram: parsed.instagram ?? true,
    };
  } catch {
    return DEFAULT_PLATFORMS;
  }
};

const getLocalDateTime = (date: Date, time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  const merged = new Date(date);
  merged.setHours(hours, minutes, 0, 0);
  return merged;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return 'Failed to post.';
};

const revokePreviews = (media: MediaFile[]) => {
  media.forEach((item) => URL.revokeObjectURL(item.preview));
};

const PostComposer = () => {
  const [content, setContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<SelectedPlatforms>(parseStoredPlatforms);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [gbpLocations, setGbpLocations] = useState<GBPLocation[]>([]);
  const [selectedGbpLocations, setSelectedGbpLocations] = useState<string[]>(() => {
    const saved = localStorage.getItem('smm_gbp_locations');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const mediaFilesRef = React.useRef<MediaFile[]>([]);

  useEffect(() => {
    mediaFilesRef.current = mediaFiles;
  }, [mediaFiles]);

  useEffect(() => {
    localStorage.setItem('smm_selected_platforms', JSON.stringify(selectedPlatforms));
  }, [selectedPlatforms]);

  useEffect(() => {
    localStorage.setItem('smm_gbp_locations', JSON.stringify(selectedGbpLocations));
  }, [selectedGbpLocations]);

  useEffect(() => {
    if (selectedPlatforms.gbp) {
      fetchLocations();
    }
  }, [selectedPlatforms.gbp]);

  useEffect(() => {
    return () => {
      revokePreviews(mediaFilesRef.current);
    };
  }, []);

  const fetchLocations = async () => {
    setIsLoadingLocations(true);
    try {
      const locations = await socialService.getGBPLocations();
      setGbpLocations(locations);
      if (locations.length > 0 && selectedGbpLocations.length === 0) {
        const defaultLoc = locations.find(l => l.title.toLowerCase().includes('ortholife')) || locations[0];
        setSelectedGbpLocations([defaultLoc.name]);
      }
    } catch (err) {
      console.error("Failed to fetch GBP locations", err);
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const handlePlatformToggle = (platformId: SocialPlatform) => {
    setSelectedPlatforms((prev) => ({
      ...prev,
      [platformId]: !prev[platformId],
    }));
  };

  const addMediaFiles = (files: File[]) => {
    const newMedia = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setMediaFiles((prev) => [...prev, ...newMedia]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addMediaFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragover" || e.type === "dragenter") {
      setIsDragging(true);
    } else if (e.type === "dragleave" || e.type === "drop") {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addMediaFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => {
      const newMedia = [...prev];
      const item = newMedia[index];
      if (item) {
        URL.revokeObjectURL(item.preview);
        newMedia.splice(index, 1);
      }
      return newMedia;
    });
  };

  const handlePost = async () => {
    const activePlatforms = Object.entries(selectedPlatforms)
      .filter(([, isActive]) => isActive)
      .map(([id]) => id as SocialPlatform);

    if (activePlatforms.length === 0) {
      toast.error('Please select at least one platform.');
      return;
    }

    if (!content.trim() && mediaFiles.length === 0) {
      toast.error('Please enter content or select media for your post.');
      return;
    }

    if (selectedPlatforms.gbp && selectedGbpLocations.length === 0) {
      toast.error('Please select at least one target Google Business Profile.');
      return;
    }

    if (selectedPlatforms.instagram && mediaFiles.length === 0) {
      toast.error('Instagram requires at least one image or video.');
      return;
    }

    const scheduledDateTime = scheduledDate ? getLocalDateTime(scheduledDate, scheduledTime) : undefined;
    if (scheduledDate && !scheduledDateTime) {
      toast.error('Please select a valid schedule time.');
      return;
    }
    if (scheduledDateTime && scheduledDateTime <= new Date()) {
      toast.error('Scheduled time must be in the future.');
      return;
    }

    setIsSubmitting(true);

    try {
      await socialService.publishAll({
        content,
        platforms: activePlatforms,
        scheduledAt: scheduledDateTime?.toISOString(),
        mediaFiles: mediaFiles.map((m) => m.file),
        gbpLocationNames: selectedPlatforms.gbp ? selectedGbpLocations : undefined,
      });

      toast.success(scheduledDateTime ? 'Post scheduled successfully!' : 'Post published successfully!');

      setContent('');
      setScheduledDate(undefined);
      setScheduledTime('09:00');
      setMediaFiles((prev) => {
        revokePreviews(prev);
        return [];
      });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
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
        <div className="space-y-3">
          <Label className="text-base font-medium">Select Platforms</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PLATFORMS.map((platform) => {
              const Icon = platform.icon;
              const isSelected = selectedPlatforms[platform.id];

                  return (
                    <div
                      key={platform.id}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        'flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 text-left relative group',
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50 text-gray-400'
                      )}
                      onClick={() => handlePlatformToggle(platform.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handlePlatformToggle(platform.id);
                        }
                      }}
                    >
                      <div className="flex w-full justify-end mb-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handlePlatformToggle(platform.id)}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                      <Icon className={cn('h-8 w-8 mb-2', isSelected ? platform.color : 'text-gray-400')} />
                      <span className={cn('text-sm font-medium', isSelected ? 'text-gray-900' : 'text-gray-500')}>
                        {platform.name}
                      </span>
                      {platform.note && (
                        <span className="text-[10px] text-gray-400 mt-1 text-center leading-tight">
                          {platform.note}
                        </span>
                      )}
                    </div>
                  );
            })}
          </div>
        </div>

        {selectedPlatforms.gbp && (
          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                <Landmark size={14} />
                Target Business Profile
              </Label>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-blue-600 hover:bg-blue-100"
                onClick={fetchLocations}
                disabled={isLoadingLocations}
              >
                <RefreshCcw size={12} className={cn(isLoadingLocations && "animate-spin")} />
              </Button>
            </div>

            {gbpLocations.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {gbpLocations.map((loc) => {
                  const isSelected = selectedGbpLocations.includes(loc.name);
                  return (
                    <button
                      key={loc.name}
                      type="button"
                      onClick={() => {
                        setSelectedGbpLocations(prev =>
                          isSelected
                            ? prev.filter(n => n !== loc.name)
                            : [...prev, loc.name]
                        );
                      }}
                      className={cn(
                        "text-left px-3 py-2 rounded-lg text-sm transition-all border flex items-center justify-between group",
                        isSelected
                          ? "bg-white border-blue-400 text-blue-900 shadow-sm font-medium"
                          : "bg-transparent border-blue-100 text-blue-700 hover:bg-blue-100/50"
                      )}
                    >
                      <span>{loc.title}</span>
                      <div className={cn(
                        "w-4 h-4 rounded border transition-colors flex items-center justify-center",
                        isSelected ? "bg-blue-600 border-blue-600" : "border-blue-300 group-hover:border-blue-400"
                      )}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-blue-600/70 italic">
                {isLoadingLocations ? "Loading profiles..." : "No managed profiles found. Ensure your account has a verified GBP listing."}
              </p>
            )}
          </div>
        )}

        <div className="space-y-3">
          <Label className="text-base font-medium">Post Content</Label>
          <div
            className={cn(
              "relative transition-all duration-200 rounded-xl group overflow-hidden",
              isDragging && "ring-2 ring-primary ring-offset-2"
            )}
            onDragOver={handleDrag}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <Textarea
              placeholder="What do you want to share with your audience?..."
              className={cn(
                "min-h-[150px] resize-y p-4 text-base rounded-xl border-gray-200 focus-visible:ring-primary/20 transition-colors",
                isDragging && "bg-primary/5 border-primary/50"
              )}
              value={content}
              maxLength={2200}
              onChange={(e) => setContent(e.target.value)}
            />

            {isDragging && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-primary/10 backdrop-blur-[1px] rounded-xl z-20 animate-in fade-in zoom-in duration-200">
                <div className="bg-white/90 p-4 rounded-full shadow-lg mb-2">
                  <ImageIcon className="h-8 w-8 text-primary" />
                </div>
                <p className="text-primary font-bold text-lg">Drop to add media</p>
                <p className="text-primary/70 text-sm">Photos and videos supported</p>
              </div>
            )}

            {mediaFiles.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 p-3 bg-white border-x border-gray-200">
                {mediaFiles.map((media, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-100 group">
                    <img src={media.preview} alt="preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
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
                  type="button"
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'h-8 gap-2',
                        scheduledDate ? 'text-primary font-medium' : 'text-gray-600 hover:text-primary hover:bg-primary/10'
                      )}
                    >
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
                      <div className="p-3 border-t space-y-2">
                        <Label htmlFor="schedule-time" className="text-xs text-gray-600">Schedule Time</Label>
                        <input
                          id="schedule-time"
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700"
                        />
                        <Button
                          type="button"
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

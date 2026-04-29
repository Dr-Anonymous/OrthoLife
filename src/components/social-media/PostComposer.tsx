import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Facebook, Instagram, MapPin, Image as ImageIcon, Send, RefreshCcw, Landmark, X, Upload, Loader2, Check } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { socialService, type SocialPlatform, type GBPLocation } from '@/utils/socialService';
import { SchedulePopover } from '@/components/SchedulePopover';

type SelectedPlatforms = Record<SocialPlatform, boolean>;
type MediaFile = { file: File; preview: string };

const PLATFORMS: PlatformConfig[] = [
  { id: 'gbp', name: 'Google Business', icon: MapPin, color: 'text-blue-600' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-600', note: 'Can auto-post to Personal Facebook' },
  { id: 'facebook_personal', name: 'Personal Profile', icon: Facebook, color: 'text-indigo-600', note: 'Fully automated via Phone' },
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
  facebook_personal: false,
  phone_bridge_only: false,
};

const parseStoredPlatforms = (): SelectedPlatforms => {
  const saved = localStorage.getItem('smm_selected_platforms');
  if (!saved) return DEFAULT_PLATFORMS;

  try {
    const parsed = JSON.parse(saved) as Partial<SelectedPlatforms>;
    return {
      gbp: parsed.gbp ?? true,
      instagram: parsed.instagram ?? true,
      facebook_personal: parsed.facebook_personal ?? false,
      phone_bridge_only: false,
    };
  } catch {
    return DEFAULT_PLATFORMS;
  }
};

import { getLocalDateTime } from '@/utils/dateUtils';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return 'Failed to post.';
};

const revokePreviews = (media: MediaFile[]) => {
  media.forEach((item) => URL.revokeObjectURL(item.preview));
};

import { useConsultant } from '@/context/ConsultantContext';

const PostComposer = () => {
  const { consultant } = useConsultant();
  const [content, setContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<SelectedPlatforms>(parseStoredPlatforms);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState("");
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
      // Separate platforms into API and Phone Bridge
      const apiPlatforms = activePlatforms.filter(p => p !== 'facebook_personal');
      const isPhoneBridgeSelected = selectedPlatforms.facebook_personal;

      const platformsForAPI = [...apiPlatforms];
      if (isPhoneBridgeSelected) {
        platformsForAPI.push('phone_bridge_only');
      }

      let result;
      if (platformsForAPI.length > 0 || (isPhoneBridgeSelected && mediaFiles.length > 0)) {
        result = await socialService.publishAll({
          content,
          platforms: platformsForAPI,
          scheduledAt: scheduledDateTime?.toISOString(),
          mediaFiles: mediaFiles.map((m) => m.file),
          gbpLocationNames: selectedPlatforms.gbp ? selectedGbpLocations : undefined,
          consultant_id: consultant?.id,
          consultant_phone: consultant?.phone
        });
      }

      // ONLY push immediately if NOT scheduled
      if (isPhoneBridgeSelected && !scheduledDateTime) {
        if (!consultant?.phone) {
          throw new Error('Could not identify consultant profile for phone bridge.');
        }

        if (!consultant?.is_whatsauto_active) {
          throw new Error('WhatsAuto is not active for your profile. Please activate it to use the Phone Bridge.');
        }

        const mediaUrl = result?.mediaUrls?.[0] || null;

        await socialService.pushToPhoneBridge(consultant.phone, {
          platform: 'facebook',
          content: content,
          mediaUrl: mediaUrl || undefined,
        });
      }

      toast.success(scheduledDateTime ? 'Post scheduled successfully!' : 'Post published successfully!');

      setContent('');
      setScheduledDate(undefined);
      setScheduledTime("");
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
    <Card className="w-full max-w-3xl mx-auto shadow-sm border-gray-100 overflow-hidden">
      <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
        <div className="flex flex-col gap-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <div className="p-1.5 bg-primary rounded-lg">
              <ImageIcon className="h-4 w-4 text-white" />
            </div>
            Create Social Post
          </CardTitle>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Select Platforms:</span>
                <span className="text-[10px] text-gray-400">At least one platform required</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((platform) => {
                  const Icon = platform.icon;
                  const isSelected = selectedPlatforms[platform.id];
                  return (
                    <button
                      key={platform.id}
                      onClick={() => handlePlatformToggle(platform.id)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all duration-300 relative group",
                        isSelected 
                          ? cn("border-primary bg-primary/5 shadow-md ring-2 ring-primary/10", platform.color)
                          : "border-gray-100 bg-white text-gray-400 hover:border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      <Icon className={cn("h-5 w-5 transition-transform duration-300", isSelected ? "scale-110" : "grayscale opacity-50")} />
                      <span className={cn("text-sm font-bold transition-colors", isSelected ? "text-gray-900" : "text-gray-400")}>
                        {platform.name}
                      </span>
                      <div className={cn(
                        "flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all duration-300",
                        isSelected 
                          ? "bg-primary border-primary scale-110 shadow-[0_0_8px_rgba(var(--primary),0.4)]" 
                          : "border-gray-200 bg-white group-hover:border-gray-300"
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-white stroke-[3px]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Google Business Profile Locations */}
            {selectedPlatforms.gbp && (
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                    <Landmark size={14} />
                    Target Business Profiles
                  </Label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-blue-600 hover:bg-blue-100 rounded-lg"
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
                            "text-left px-3 py-2 rounded-lg text-xs transition-all border flex items-center justify-between group",
                            isSelected
                              ? "bg-white border-blue-400 text-blue-900 shadow-sm font-semibold"
                              : "bg-transparent border-blue-100 text-blue-700 hover:bg-blue-100/50"
                          )}
                        >
                          <span className="truncate pr-2">{loc.title}</span>
                          <div className={cn(
                            "w-3.5 h-3.5 rounded border transition-colors flex items-center justify-center shrink-0",
                            isSelected ? "bg-blue-600 border-blue-600" : "border-blue-300 group-hover:border-blue-400"
                          )}>
                            {isSelected && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-blue-600/70 italic px-1">
                    {isLoadingLocations ? "Loading profiles..." : "No managed profiles found."}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div 
          className={cn(
            "relative min-h-[350px] flex flex-col transition-all duration-300",
            isDragging && "bg-primary/5"
          )}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <Textarea
            placeholder="What's on your mind? Share an update across your platforms..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 min-h-[250px] border-none focus-visible:ring-0 text-base p-6 resize-none bg-transparent placeholder:text-gray-300 leading-relaxed"
          />

          {/* Media Previews Grid */}
          {mediaFiles.length > 0 && (
            <div className="px-6 pb-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {mediaFiles.map((file, index) => (
                <div key={index} className="relative group aspect-square">
                  <div className="w-full h-full rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-gray-100">
                    <img
                      src={file.preview}
                      alt={`Preview ${index}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-lg border-2 border-white scale-0 group-hover:scale-100 transition-transform duration-200"
                    onClick={() => removeMedia(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {isDragging && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-primary/10 backdrop-blur-[2px] z-20">
              <div className="bg-white p-4 rounded-3xl shadow-2xl mb-3 animate-bounce">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <p className="text-primary font-bold text-lg">Drop media to upload</p>
            </div>
          )}

          {/* Unified Composer Toolbar */}
          <div className="p-3 md:p-4 border-t border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <input
                id="media-upload"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-10 px-3 md:px-4 rounded-xl text-gray-500 hover:text-primary hover:bg-primary/5 gap-2 transition-all"
                onClick={() => document.getElementById('media-upload')?.click()}
              >
                <ImageIcon className="w-4 h-4 text-primary" />
                <span className="font-bold text-xs">Add Media</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-10 px-3 md:px-4 rounded-xl text-gray-400 hover:text-destructive hover:bg-destructive/5 gap-2 transition-all"
                onClick={() => {
                  setContent('');
                  setMediaFiles([]);
                }}
                disabled={isSubmitting || (!content && mediaFiles.length === 0)}
              >
                <span className="font-bold text-xs">Clear</span>
              </Button>
            </div>

            {(selectedPlatforms.gbp || selectedPlatforms.instagram) && (
              <div className="hidden sm:flex items-center gap-2">
                <div className={cn(
                  "text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full transition-all duration-300",
                  (selectedPlatforms.instagram && content.length > 2200)
                    ? "bg-destructive/10 text-destructive animate-pulse" 
                    : (selectedPlatforms.gbp && content.length > 1500)
                      ? "bg-warning/10 text-warning" 
                      : "bg-gray-100 text-gray-400"
                )}>
                  {content.length} characters
                </div>
                {selectedPlatforms.gbp && content.length > 1500 && (
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                    Exceeds GMB Limit
                  </span>
                )}
                {selectedPlatforms.instagram && content.length > 2200 && (
                  <span className="text-[9px] font-bold text-destructive uppercase tracking-tighter">
                    Exceeds Instagram Limit
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
              <SchedulePopover
                scheduledDate={scheduledDate}
                scheduledTime={scheduledTime}
                onDateChange={setScheduledDate}
                onTimeChange={setScheduledTime}
                disabled={isSubmitting}
                className="h-10 w-10 rounded-xl border-gray-200"
              />
              <Button
                size="lg"
                onClick={handlePost}
                disabled={isSubmitting || !Object.values(selectedPlatforms).some(v => v) || (!content && mediaFiles.length === 0)}
                className="flex-1 sm:flex-initial sm:px-8 font-bold gap-2 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all h-10 text-sm"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {scheduledDate ? 'Schedule' : 'Publish'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PostComposer;

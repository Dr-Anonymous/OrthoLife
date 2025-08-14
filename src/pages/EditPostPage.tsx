import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlogPostForm, { PostFormValues } from '@/components/BlogPostForm';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const EditPostPage = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [initialData, setInitialData] = useState<Partial<PostFormValues> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('id', postId)
          .single();

        if (error) throw error;
        
        if (data) {
          // The form expects category_id, so we just pass the data as is.
          setInitialData(data);
        } else {
            toast({ title: "Error", description: "Post not found.", variant: "destructive" });
            navigate('/blog');
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        toast({ title: "Error", description: "Could not fetch post data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId, navigate, toast]);

  const handleSubmit = async (values: PostFormValues) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update(values)
        .eq('id', postId);

      if (error) {
        throw error;
      }

      toast({
        title: "Post updated!",
        description: "Your blog post has been successfully updated.",
      });

      navigate(`/blog/${postId}`);

    } catch (error) {
      console.error('Error updating post:', error);
      toast({
        title: "Error",
        description: "There was an error updating the post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow bg-muted/50 pt-20">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto">
              <Skeleton className="h-8 w-1/2 mb-8" />
              <div className="space-y-8">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-muted/50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-heading font-bold text-primary mb-8">
              Edit Post
            </h1>
            {initialData ? (
              <BlogPostForm
                initialData={initialData}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            ) : (
                <p>Post data could not be loaded.</p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EditPostPage;

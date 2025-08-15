import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlogPostForm, { PostFormValues } from '@/components/BlogPostForm';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

const EditPostPage = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [initialData, setInitialData] = useState<Partial<PostFormValues> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*, categories(name)')
          .eq('id', postId)
          .single();

        if (error) throw error;
        
        if (data) {
          const { categories, ...rest } = data;
          setInitialData({
            ...rest,
            category_name: categories?.name || '',
          });
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
      const { category_name, ...postData } = values;

      // Find or create category
      let { data: category, error: categoryError } = await supabase
        .from('categories')
        .select('id')
        .eq('name', category_name)
        .single();

      if (categoryError && categoryError.code !== 'PGRST116') {
        throw categoryError;
      }

      let categoryId: number;
      if (category) {
        categoryId = category.id;
      } else {
        const { data: newCategory, error: newCategoryError } = await supabase
          .from('categories')
          .insert({ name: category_name })
          .select('id')
          .single();
        if (newCategoryError) throw newCategoryError;
        categoryId = newCategory.id;
      }

      const postToUpdate = {
        ...postData,
        category_id: categoryId,
      };

      const { error } = await supabase
        .from('posts')
        .update(postToUpdate)
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

  const handleDelete = async () => {
    if (!postId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast({
        title: "Post deleted!",
        description: "The blog post has been successfully deleted.",
      });
      navigate('/blog');

    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: "There was an error deleting the post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
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
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-heading font-bold text-primary">
                Edit Post
              </h1>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Post
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete this
                      blog post and remove its data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                      {isDeleting ? 'Deleting...' : 'Continue'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
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

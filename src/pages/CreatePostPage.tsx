import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlogPostForm, { PostFormValues } from '@/components/BlogPostForm';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

const CreatePostPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: PostFormValues) => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([values])
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "Post created!",
        description: "Your new blog post has been successfully created.",
      });

      // Redirect to the new post's page
      if (data) {
        navigate(`/blog/${data.id}`);
      } else {
        navigate('/blog');
      }

    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "There was an error creating the post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-muted/50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-heading font-bold text-primary mb-8">
              Create New Post
            </h1>
            <BlogPostForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CreatePostPage;

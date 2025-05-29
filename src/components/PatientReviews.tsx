
import React, { useState, useEffect } from 'react';
import { Star, Quote, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  profilePhoto?: string;
}

interface ReviewsData {
  businessName: string;
  overallRating: number;
  totalReviews: number;
  reviews: Review[];
}

const PatientReviews = () => {
  const [reviewsData, setReviewsData] = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('fetch-google-reviews');
      
      if (error) {
        throw error;
      }
      
      setReviewsData(data);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Skeleton className="h-8 w-64 mx-auto mb-4" />
            <Skeleton className="h-4 w-96 mx-auto" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <Skeleton className="h-8 w-24" />
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Patient Reviews</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">What Our Patients Say</h2>
          {reviewsData && (
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                {renderStars(Math.round(reviewsData.overallRating))}
                <span className="text-xl font-semibold text-gray-900">
                  {reviewsData.overallRating.toFixed(1)}
                </span>
              </div>
              <span className="text-gray-600">
                Based on {reviewsData.totalReviews} reviews
              </span>
            </div>
          )}
          <p className="text-gray-600 max-w-2xl mx-auto">
            Read what our patients have to say about their experience at OrthoLife.
            Your health and satisfaction are our top priorities.
          </p>
        </div>

        {reviewsData && reviewsData.reviews.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviewsData.reviews.slice(0, 6).map((review) => (
              <Card key={review.id} className="p-6 hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0">
                      {review.profilePhoto ? (
                        <img
                          src={review.profilePhoto}
                          alt={review.author}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{review.author}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {renderStars(review.rating)}
                        <span className="text-sm text-gray-500">
                          {formatDate(review.date)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <Quote className="w-6 h-6 text-blue-200 absolute -top-2 -left-1" />
                    <p className="text-gray-700 leading-relaxed pl-4">
                      {review.text}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <p className="text-gray-600">
            Want to share your experience? Leave us a review on{' '}
            <a
              href="https://search.google.com/local/writereview?placeid=ChIJJT3ZgSUpODoRsyD-GOZ2YYg"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Google
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default PatientReviews;

import { useRef, useCallback, useEffect } from 'react';

interface UseInfiniteScrollOptions {
  onLoadMore: () => void;
  isLoading: boolean;
  hasNextPage: boolean;
  rootMargin?: string;
}

export const useInfiniteScroll = ({
  onLoadMore,
  isLoading,
  hasNextPage,
  rootMargin = '0px',
}: UseInfiniteScrollOptions) => {
  const observer = useRef<IntersectionObserver | null>(null);

  const lastElementRef = useCallback(
    (node: Element | null) => {
      if (isLoading || !hasNextPage) return;

      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            onLoadMore();
          }
        },
        { rootMargin }
      );

      if (node) observer.current.observe(node);
    },
    [isLoading, hasNextPage, onLoadMore, rootMargin]
  );

  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, []);

  return { lastElementRef };
};

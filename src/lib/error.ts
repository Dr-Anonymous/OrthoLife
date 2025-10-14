import { toast } from '@/hooks/use-toast';

export const handleError = (error: any, defaultMessage: string = 'An unexpected error occurred.') => {
  console.error(error);

  let message = defaultMessage;
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  toast({
    variant: 'destructive',
    title: 'Error',
    description: message,
  });
};
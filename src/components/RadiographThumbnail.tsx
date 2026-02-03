import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Image as ImageIcon, Loader2, CheckCircle, Clock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RadiographThumbnailProps {
  storagePath: string;
  analysisStatus: string | null;
  originalFilename: string | null;
  onClick?: () => void;
  className?: string;
}

export function RadiographThumbnail({ 
  storagePath, 
  analysisStatus,
  originalFilename,
  onClick,
  className 
}: RadiographThumbnailProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchImageUrl = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('radiographs')
          .createSignedUrl(storagePath, 3600); // 1 hour expiry

        if (error) {
          console.error('Error getting signed URL:', error);
          setError(true);
          return;
        }

        setImageUrl(data.signedUrl);
      } catch (err) {
        console.error('Error:', err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImageUrl();
  }, [storagePath]);

  const getStatusIcon = () => {
    switch (analysisStatus) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'processing':
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "aspect-square rounded-lg bg-muted border cursor-pointer hover:border-primary/50 hover:shadow-md transition-all overflow-hidden relative group",
        className
      )}
      onClick={onClick}
    >
      {isLoading ? (
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error || !imageUrl ? (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        </div>
      ) : (
        <>
          <img
            src={imageUrl}
            alt={originalFilename || 'Radiograph'}
            className="w-full h-full object-cover"
            onError={() => setError(true)}
          />
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        </>
      )}
      
      {/* Status badge */}
      {analysisStatus && (
        <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1">
          {getStatusIcon()}
        </div>
      )}
    </div>
  );
}

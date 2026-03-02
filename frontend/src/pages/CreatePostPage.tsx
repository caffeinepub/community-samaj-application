import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useGetUserCommunities, useCreatePost, useIsCommunityAdmin } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImagePlus, Loader2, X, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

export default function CreatePostPage() {
  const navigate = useNavigate();
  const { data: communities = [], isLoading: communitiesLoading } = useGetUserCommunities();
  const createPostMutation = useCreatePost();
  
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [retryCount, setRetryCount] = useState(0);

  const selectedCommunityIdBigInt = selectedCommunityId ? BigInt(selectedCommunityId) : null;
  
  const { data: isAdmin = false, isLoading: isAdminLoading } = useIsCommunityAdmin(selectedCommunityIdBigInt);

  // Auto-select first community if user has only one
  useEffect(() => {
    if (communities.length === 1 && !selectedCommunityId) {
      setSelectedCommunityId(communities[0].id.toString());
    }
  }, [communities, selectedCommunityId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      setImage(file);
      setUploadStatus('idle');
      setRetryCount(0);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.onerror = () => {
        toast.error('Failed to load image preview');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
    setUploadProgress(0);
    setUploadStatus('idle');
    setRetryCount(0);
    // Reset file input
    const fileInput = document.getElementById('image') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const attemptUpload = async (attemptNumber: number): Promise<bigint> => {
    setRetryCount(attemptNumber);
    setUploadProgress(0);
    
    try {
      const postId = await createPostMutation.mutateAsync({
        content: content.trim() || ' ',
        communityId: BigInt(selectedCommunityId),
        image: image || undefined,
        onUploadProgress: (percentage) => {
          setUploadProgress(Math.min(percentage, 100));
        },
      });
      
      return postId;
    } catch (error: any) {
      // Check if it's a network or storage error that can be retried
      const isRetryableError = 
        error.message?.includes('blob') ||
        error.message?.includes('upload') ||
        error.message?.includes('storage') ||
        error.message?.includes('network') ||
        error.message?.includes('gateway') ||
        error.message?.includes('certificate') ||
        error.message?.includes('cashier');
      
      if (isRetryableError && attemptNumber < MAX_RETRIES) {
        console.log(`Upload attempt ${attemptNumber} failed, retrying...`);
        toast.info(`Upload failed, retrying... (${attemptNumber}/${MAX_RETRIES})`, {
          description: 'Please wait while we retry the upload',
        });
        await sleep(RETRY_DELAY * attemptNumber); // Exponential backoff
        return attemptUpload(attemptNumber + 1);
      }
      
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!content.trim() && !image) {
      toast.error('Please enter some content or add an image');
      return;
    }

    if (content.length > 500) {
      toast.error('Content must be less than 500 characters');
      return;
    }

    if (!selectedCommunityId) {
      toast.error('Please select a community');
      return;
    }

    // If image is selected but not properly loaded
    if (image && !imagePreview) {
      toast.error('Please wait for the image to load');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadStatus('uploading');
      setRetryCount(0);

      // Attempt upload with automatic retry
      await attemptUpload(1);
      
      setUploadStatus('success');
      
      if (isAdmin) {
        toast.success('Post published successfully!', {
          description: 'Your post is now visible to all community members',
        });
      } else {
        toast.success('Post submitted for approval', {
          description: 'An admin will review your post shortly',
        });
      }
      
      // Reset form
      setContent('');
      setImage(null);
      setImagePreview(null);
      setUploadProgress(0);
      setIsUploading(false);
      setRetryCount(0);
      
      // Navigate to feed after successful post
      setTimeout(() => {
        navigate({ to: '/feed' });
      }, 1500);
    } catch (error: any) {
      console.error('Failed to create post:', error);
      setUploadStatus('error');
      
      // Provide more specific error messages
      let errorMessage = 'Failed to create post';
      let errorDescription = 'Please try again';
      
      if (error.message?.includes('blob') || error.message?.includes('upload') || error.message?.includes('storage')) {
        errorMessage = 'Failed to upload image';
        errorDescription = 'The image upload failed after multiple attempts. Please try with a smaller image or check your connection.';
      } else if (error.message?.includes('size')) {
        errorMessage = 'Image is too large';
        errorDescription = 'Please use an image smaller than 5MB.';
      } else if (error.message?.includes('certificate') || error.message?.includes('cashier')) {
        errorMessage = 'Storage service error';
        errorDescription = 'The storage service is temporarily unavailable. Please try again in a moment.';
      } else if (error.message) {
        errorDescription = error.message;
      }
      
      toast.error(errorMessage, {
        description: errorDescription,
      });
      
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  if (communitiesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (communities.length === 0) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-bold mb-2">No Communities</h2>
            <p className="text-muted-foreground mb-4">You need to join or create a community first.</p>
            <Button onClick={() => navigate({ to: '/' })}>
              Go to Community Selection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSubmitting = createPostMutation.isPending || isUploading;

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Post</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Community Selection */}
            {communities.length > 1 && (
              <div>
                <Label htmlFor="community">Select Community</Label>
                <Select value={selectedCommunityId} onValueChange={setSelectedCommunityId}>
                  <SelectTrigger id="community">
                    <SelectValue placeholder="Choose a community" />
                  </SelectTrigger>
                  <SelectContent>
                    {communities.map((community) => (
                      <SelectItem key={community.id.toString()} value={community.id.toString()}>
                        {community.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="content">What's on your mind?</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your thoughts..."
                rows={6}
                maxLength={500}
                className="resize-none"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {content.length}/500 characters
              </p>
            </div>

            <div>
              <Label htmlFor="image">Add Image (Optional)</Label>
              <div className="mt-2">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={isSubmitting}
                />
                {!imagePreview ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => document.getElementById('image')?.click()}
                    disabled={isSubmitting}
                  >
                    <ImagePlus className="h-4 w-4" />
                    Add Image
                  </Button>
                ) : (
                  <div className="relative mt-4 rounded-lg border overflow-hidden">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full max-h-96 object-contain bg-muted"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={handleRemoveImage}
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    {image && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-xs">
                        {image.name} ({(image.size / 1024).toFixed(1)} KB)
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Upload Progress */}
            {isUploading && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    {retryCount > 1 && <RefreshCw className="h-4 w-4 animate-spin" />}
                    {uploadProgress < 100 ? (
                      retryCount > 1 ? `Retrying upload (${retryCount}/${MAX_RETRIES})...` : 'Uploading image...'
                    ) : (
                      'Processing...'
                    )}
                  </span>
                  <span className="font-medium">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Upload Status */}
            {uploadStatus === 'success' && (
              <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  {image ? 'Image uploaded successfully!' : 'Post created successfully!'}
                </AlertDescription>
              </Alert>
            )}

            {uploadStatus === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Upload failed after {retryCount} {retryCount === 1 ? 'attempt' : 'attempts'}. 
                  Please try again or remove the image.
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUploading ? (
                    retryCount > 1 ? `Retrying (${retryCount}/${MAX_RETRIES})...` : 'Uploading...'
                  ) : (
                    'Posting...'
                  )}
                </>
              ) : (
                'Post'
              )}
            </Button>

            {/* Status Notice */}
            {!isAdminLoading && selectedCommunityId && (
              <div className={`rounded-lg p-4 flex items-start gap-3 ${
                isAdmin ? 'bg-green-50 dark:bg-green-950/20' : 'bg-muted/50'
              }`}>
                <img 
                  src={isAdmin 
                    ? "/assets/generated/admin-panel-icon-transparent.dim_64x64.png"
                    : "/assets/generated/pending-approval-icon.dim_48x48.png"
                  } 
                  alt={isAdmin ? "Admin" : "Pending"} 
                  className="h-8 w-8"
                />
                <div className="text-sm">
                  <p className="font-medium">
                    {isAdmin ? 'Admin Post - Auto-Approved' : 'Pending Approval'}
                  </p>
                  <p className="text-muted-foreground">
                    {isAdmin 
                      ? 'Your post will be published immediately as you are an admin'
                      : 'Your post will be visible after admin approval'
                    }
                  </p>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

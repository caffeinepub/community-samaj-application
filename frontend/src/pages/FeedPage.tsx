import { useGetUserCommunities, useGetAllApprovedPosts, useGetCallerUserProfile } from '../hooks/useQueries';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Heart, MessageCircle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function FeedPage() {
  const navigate = useNavigate();
  const { data: userCommunities = [], isLoading: communitiesLoading } = useGetUserCommunities();
  const { data: userProfile } = useGetCallerUserProfile();

  // Get posts from first community (for now)
  const firstCommunityId = userCommunities.length > 0 ? userCommunities[0].id : null;
  const { data: posts = [], isLoading: postsLoading } = useGetAllApprovedPosts(firstCommunityId);

  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());

  const handleOpenCommunity = (communityId: bigint) => {
    navigate({ to: '/community/$communityId', params: { communityId: communityId.toString() } });
  };

  const handleImageError = (postId: string) => {
    setImageLoadErrors(prev => new Set(prev).add(postId));
  };

  useEffect(() => {
    // Reset image errors when posts change
    setImageLoadErrors(new Set());
  }, [posts]);

  if (communitiesLoading || postsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If user has no communities, redirect to community selection
  if (userCommunities.length === 0) {
    navigate({ to: '/' });
    return null;
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* My Communities */}
      {userCommunities.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">My Communities</h2>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {userCommunities.map((community) => (
                <Card 
                  key={community.id.toString()} 
                  className="p-3 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleOpenCommunity(community.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{community.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        ID: {community.id.toString()}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost">
                      View
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts Feed */}
      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <img 
                src="/assets/generated/no-posts-illustration.dim_400x300.png" 
                alt="No posts" 
                className="h-48 mx-auto opacity-50"
              />
              <h3 className="text-xl font-semibold">No posts yet</h3>
              <p className="text-muted-foreground">Be the first to post!</p>
              <Button onClick={() => navigate({ to: '/create-post' })}>
                Create Your First Post
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        posts.map((post) => {
          const postIdStr = post.id.toString();
          const hasImageError = imageLoadErrors.has(postIdStr);
          
          return (
            <Card key={postIdStr}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <img 
                    src="/assets/generated/default-avatar.dim_100x100.png" 
                    alt="Avatar" 
                    className="h-10 w-10 rounded-full"
                  />
                  <div>
                    <p className="font-semibold">
                      {userProfile?.fullName || 'Community Member'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Post ID: {postIdStr}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>{post.content}</p>
                
                {/* Display image if available */}
                {post.image && !hasImageError && (
                  <div className="rounded-lg overflow-hidden border bg-muted">
                    <img 
                      src={post.image.getDirectURL()} 
                      alt="Post attachment" 
                      className="w-full max-h-96 object-contain"
                      onError={() => handleImageError(postIdStr)}
                      loading="lazy"
                    />
                  </div>
                )}
                
                {/* Show error message if image failed to load */}
                {post.image && hasImageError && (
                  <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground">
                    <p className="text-sm">Image failed to load</p>
                  </div>
                )}
                
                <div className="flex items-center gap-4 pt-2">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Heart className="h-4 w-4" />
                    0
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <MessageCircle className="h-4 w-4" />
                    0
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

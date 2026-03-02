import { useState } from 'react';
import { useGetAllCommunities, useCreateCommunity, useGetUserCommunities, useRequestToJoinCommunity } from '../hooks/useQueries';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Plus, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function CommunitySelectionPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [communityName, setCommunityName] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  const { data: communities = [], isLoading: communitiesLoading } = useGetAllCommunities();
  const { data: userCommunities = [], isLoading: userCommunitiesLoading } = useGetUserCommunities();
  const createCommunityMutation = useCreateCommunity();
  const requestToJoinMutation = useRequestToJoinCommunity();

  const hasJoinedCommunity = userCommunities.length > 0;

  const handleCreateCommunity = async () => {
    if (!communityName.trim()) {
      toast.error('Please enter a community name');
      return;
    }

    try {
      const communityId = await createCommunityMutation.mutateAsync(communityName.trim());
      toast.success('Community created successfully!');
      setCommunityName('');
      setCreateDialogOpen(false);
      // Navigate to the newly created community
      navigate({ to: '/community/$communityId', params: { communityId: communityId.toString() } });
    } catch (error: any) {
      console.error('Error creating community:', error);
      toast.error(error.message || 'Failed to create community');
    }
  };

  const handleRequestToJoin = async (communityId: bigint) => {
    try {
      await requestToJoinMutation.mutateAsync(communityId);
      toast.success('Join request sent! Awaiting admin approval.');
    } catch (error: any) {
      console.error('Error requesting to join:', error);
      toast.error(error.message || 'Failed to send join request');
    }
  };

  const filteredCommunities = communities.filter(community =>
    community.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If user has already joined/created a community, redirect to feed
  if (hasJoinedCommunity && !communitiesLoading && !userCommunitiesLoading) {
    navigate({ to: '/feed' });
    return null;
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Welcome Header */}
      <div className="text-center space-y-2 mb-8">
        <img 
          src="/assets/generated/community-logo-transparent.dim_200x200.png" 
          alt="Community Logo" 
          className="h-24 w-24 mx-auto mb-4"
        />
        <h1 className="text-4xl font-bold">Welcome to Community</h1>
        <p className="text-muted-foreground text-lg">
          Create or join a community to get started
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Create Community Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-primary/10 rounded-full">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Create Community</CardTitle>
            </div>
            <CardDescription>
              Start your own community and become an admin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" size="lg">
                  <Plus className="mr-2 h-5 w-5" />
                  Create Community
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Community</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input 
                    placeholder="Community Name" 
                    value={communityName}
                    onChange={(e) => setCommunityName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateCommunity();
                      }
                    }}
                  />
                  <Button 
                    className="w-full" 
                    onClick={handleCreateCommunity}
                    disabled={createCommunityMutation.isPending || !communityName.trim()}
                  >
                    {createCommunityMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Search Community Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-primary/10 rounded-full">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Search Community</CardTitle>
            </div>
            <CardDescription>
              Browse and join existing communities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" variant="outline" size="lg">
                  <Search className="mr-2 h-5 w-5" />
                  Search Communities
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Search Community</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search communities..." 
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  {communitiesLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground mt-2">Loading...</p>
                    </div>
                  ) : filteredCommunities.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      {searchQuery ? 'No communities found' : 'No communities available yet'}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {filteredCommunities.map((community) => (
                        <Card 
                          key={community.id.toString()} 
                          className="p-4 hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{community.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                ID: {community.id.toString()}
                              </p>
                            </div>
                            <Button 
                              size="sm" 
                              onClick={() => handleRequestToJoin(community.id)}
                              disabled={requestToJoinMutation.isPending}
                            >
                              {requestToJoinMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                'Join'
                              )}
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Available Communities Preview */}
      {communities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Communities</CardTitle>
            <CardDescription>
              Explore communities you can join
            </CardDescription>
          </CardHeader>
          <CardContent>
            {communitiesLoading ? (
              <div className="text-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-3">
                {communities.slice(0, 5).map((community) => (
                  <Card 
                    key={community.id.toString()} 
                    className="p-4 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{community.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          ID: {community.id.toString()}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleRequestToJoin(community.id)}
                        disabled={requestToJoinMutation.isPending}
                      >
                        Join
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

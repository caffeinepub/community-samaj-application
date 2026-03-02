import { useParams, useNavigate } from '@tanstack/react-router';
import { useGetAllCommunities, useIsCommunityAdmin, useGetCommunityMembers, useGetAllApprovedPosts } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, FileText, Settings, Loader2, Shield } from 'lucide-react';
import { useState } from 'react';
import AdminPanel from '../components/AdminPanel';

export default function CommunityDashboard() {
  const { communityId } = useParams({ from: '/community/$communityId' });
  const navigate = useNavigate();
  const { data: communities = [], isLoading } = useGetAllCommunities();
  const [activeTab, setActiveTab] = useState('overview');

  const community = communities.find(c => c.id.toString() === communityId);
  const communityIdBigInt = community?.id || null;
  
  const { data: isAdmin = false, isLoading: isAdminLoading } = useIsCommunityAdmin(communityIdBigInt);
  const { data: members = [], isLoading: membersLoading } = useGetCommunityMembers(communityIdBigInt);
  const { data: posts = [], isLoading: postsLoading } = useGetAllApprovedPosts(communityIdBigInt);

  if (isLoading || isAdminLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-bold mb-2">Community Not Found</h2>
            <p className="text-muted-foreground mb-4">The community you're looking for doesn't exist.</p>
            <Button onClick={() => navigate({ to: '/feed' })}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Feed
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/feed' })}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{community.name}</h1>
          <p className="text-muted-foreground">
            Community ID: {community.id.toString()}
          </p>
        </div>
        {isAdmin && (
          <Badge variant="secondary" className="gap-1">
            <Shield className="h-3 w-3" />
            Admin
          </Badge>
        )}
      </div>

      {/* Hero Image */}
      <Card className="overflow-hidden">
        <img 
          src="/assets/generated/community-dashboard-hero.dim_800x400.png" 
          alt="Community Hero" 
          className="w-full h-48 object-cover"
        />
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="overview">
            <FileText className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            Members
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin">
              <Settings className="h-4 w-4 mr-2" />
              Admin Panel
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{members.length}</div>
                <p className="text-xs text-muted-foreground">
                  {members.length === 0 ? 'No members yet' : 'Active members'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{posts.length}</div>
                <p className="text-xs text-muted-foreground">
                  {posts.length === 0 ? 'No posts yet' : 'Approved posts'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Community ID</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{community.id.toString()}</div>
                <p className="text-xs text-muted-foreground">Unique identifier</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Posts</CardTitle>
            </CardHeader>
            <CardContent>
              {postsLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12">
                  <img 
                    src="/assets/generated/no-posts-illustration.dim_400x300.png" 
                    alt="No posts" 
                    className="h-32 mx-auto opacity-50 mb-4"
                  />
                  <p className="text-muted-foreground">No posts yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Be the first to post!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {posts.slice(0, 5).map((post) => (
                    <Card key={post.id.toString()} className="p-4">
                      <div className="flex items-start gap-3">
                        <img 
                          src="/assets/generated/default-avatar.dim_100x100.png" 
                          alt="Avatar" 
                          className="h-10 w-10 rounded-full"
                        />
                        <div className="flex-1 space-y-2">
                          <div>
                            <p className="font-semibold text-sm">
                              {post.author.toString().slice(0, 12)}...
                            </p>
                            <p className="text-sm mt-1">{post.content}</p>
                          </div>
                          
                          {/* Display image if available */}
                          {post.image && (
                            <div className="rounded-lg overflow-hidden border">
                              <img 
                                src={post.image.getDirectURL()} 
                                alt="Post attachment" 
                                className="w-full max-h-48 object-contain bg-muted"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Community Members ({members.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No members found</p>
                  <p className="text-sm text-muted-foreground mt-1">Members will appear here once they join</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {members.map((member) => (
                    <Card key={member.toString()} className="p-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src="/assets/generated/default-avatar.dim_100x100.png" 
                          alt="Avatar" 
                          className="h-10 w-10 rounded-full"
                        />
                        <div>
                          <p className="font-medium">
                            {member.toString().slice(0, 12)}...
                          </p>
                          <p className="text-xs text-muted-foreground">Member</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="admin" className="space-y-4">
            <AdminPanel communityId={community.id} communityName={community.name} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

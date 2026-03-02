import { useGetPendingPosts, useApprovePost, useRejectPost, useGetPendingJoinRequests, useApproveJoinRequest, useRejectJoinRequest, useGetCommunityAdmins, useGetCommunityMembers, useGetCallerUserProfile, usePromoteToAdmin } from '../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserCheck, FileCheck, Shield, UserPlus, Loader2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Principal } from '@dfinity/principal';

interface AdminPanelProps {
  communityId: bigint;
  communityName: string;
}

export default function AdminPanel({ communityId, communityName }: AdminPanelProps) {
  const { data: userProfile } = useGetCallerUserProfile();
  const { data: pendingPosts = [], isLoading: postsLoading, refetch: refetchPosts } = useGetPendingPosts(communityId);
  const { data: pendingJoinRequests = [], isLoading: joinRequestsLoading, refetch: refetchJoinRequests } = useGetPendingJoinRequests(communityId);
  const { data: communityAdmins = [], isLoading: adminsLoading } = useGetCommunityAdmins(communityId);
  const { data: communityMembers = [], isLoading: membersLoading } = useGetCommunityMembers(communityId);
  
  const approvePostMutation = useApprovePost();
  const rejectPostMutation = useRejectPost();
  const approveJoinRequestMutation = useApproveJoinRequest();
  const rejectJoinRequestMutation = useRejectJoinRequest();
  const promoteToAdminMutation = usePromoteToAdmin();
  
  const maxAdmins = 5;

  const handleApprovePost = async (postId: bigint) => {
    try {
      await approvePostMutation.mutateAsync(postId);
      toast.success('Post approved successfully');
      refetchPosts();
    } catch (error: any) {
      console.error('Failed to approve post:', error);
      toast.error(error.message || 'Failed to approve post');
    }
  };

  const handleRejectPost = async (postId: bigint) => {
    if (!confirm('Are you sure you want to reject this post?')) {
      return;
    }
    
    try {
      await rejectPostMutation.mutateAsync(postId);
      toast.success('Post rejected successfully');
      refetchPosts();
    } catch (error: any) {
      console.error('Failed to reject post:', error);
      toast.error(error.message || 'Failed to reject post');
    }
  };

  const handleApproveJoinRequest = async (requestId: bigint) => {
    try {
      await approveJoinRequestMutation.mutateAsync(requestId);
      toast.success('Member approved successfully');
      refetchJoinRequests();
    } catch (error: any) {
      console.error('Failed to approve member:', error);
      toast.error(error.message || 'Failed to approve member');
    }
  };

  const handleRejectJoinRequest = async (requestId: bigint) => {
    if (!confirm('Are you sure you want to reject this join request?')) {
      return;
    }
    
    try {
      await rejectJoinRequestMutation.mutateAsync(requestId);
      toast.success('Join request rejected');
      refetchJoinRequests();
    } catch (error: any) {
      console.error('Failed to reject join request:', error);
      toast.error(error.message || 'Failed to reject join request');
    }
  };

  const handlePromoteToAdmin = async (userPrincipal: Principal) => {
    if (communityAdmins.length >= maxAdmins) {
      toast.error(`Cannot promote: Maximum of ${maxAdmins} admins allowed per community`);
      return;
    }

    try {
      await promoteToAdminMutation.mutateAsync({ communityId, userToPromote: userPrincipal });
      toast.success('Member promoted to admin successfully');
    } catch (error: any) {
      console.error('Failed to promote member:', error);
      toast.error(error.message || 'Failed to promote member');
    }
  };

  // Get non-admin members who can be promoted
  const promotableMembers = communityMembers.filter(
    member => !communityAdmins.some(admin => admin.toString() === member.toString())
  );

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <img 
              src="/assets/generated/admin-panel-icon-transparent.dim_64x64.png" 
              alt="Admin Panel" 
              className="h-12 w-12"
            />
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Admin Panel
              </CardTitle>
              <CardDescription>
                Manage {communityName} community
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Admin Limit Warning */}
      {communityAdmins.length >= maxAdmins - 1 && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            {communityAdmins.length === maxAdmins 
              ? `Maximum admin limit reached (${maxAdmins}/${maxAdmins}). Cannot promote more admins.`
              : `Approaching admin limit (${communityAdmins.length}/${maxAdmins}). Only ${maxAdmins - communityAdmins.length} slot(s) remaining.`
            }
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="members">
            <UserCheck className="h-4 w-4 mr-2" />
            Join Requests
            {pendingJoinRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingJoinRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="posts">
            <FileCheck className="h-4 w-4 mr-2" />
            Pending Posts
            {pendingPosts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingPosts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="admins">
            <UserPlus className="h-4 w-4 mr-2" />
            Manage Admins
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <img 
                  src="/assets/generated/pending-member-icon-transparent.dim_48x48.png" 
                  alt="Pending Members" 
                  className="h-10 w-10"
                />
                <div>
                  <CardTitle>Pending Join Requests</CardTitle>
                  <CardDescription>
                    Review and approve users who want to join your community
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {joinRequestsLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : pendingJoinRequests.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No pending join requests</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    New join requests will appear here for your approval
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingJoinRequests.map((request) => (
                    <Card key={request.id.toString()} className="p-4 border-2 border-primary/20">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <img 
                              src="/assets/generated/default-avatar.dim_100x100.png" 
                              alt="Avatar" 
                              className="h-12 w-12 rounded-full"
                            />
                            <div>
                              <p className="font-semibold text-lg">
                                {request.user.toString().slice(0, 12)}...
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Request ID: {request.id.toString()}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary">Pending</Badge>
                        </div>
                        
                        <div className="flex gap-2 pt-2">
                          <Button 
                            size="sm" 
                            variant="default" 
                            className="flex-1"
                            onClick={() => handleApproveJoinRequest(request.id)}
                            disabled={approveJoinRequestMutation.isPending}
                          >
                            {approveJoinRequestMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Approving...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            className="flex-1"
                            onClick={() => handleRejectJoinRequest(request.id)}
                            disabled={rejectJoinRequestMutation.isPending}
                          >
                            {rejectJoinRequestMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Rejecting...
                              </>
                            ) : (
                              <>
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Posts</CardTitle>
              <CardDescription>
                Review and approve posts from non-admin members. Admin posts are automatically approved.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {postsLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : pendingPosts.length === 0 ? (
                <div className="text-center py-12">
                  <FileCheck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No pending posts</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Posts from non-admin members awaiting approval will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingPosts.map((post) => (
                    <Card key={post.id.toString()} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <img 
                            src="/assets/generated/default-avatar.dim_100x100.png" 
                            alt="Avatar" 
                            className="h-10 w-10 rounded-full"
                          />
                          <div className="flex-1">
                            <p className="font-semibold">
                              {post.author.toString().slice(0, 12)}...
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Post ID: {post.id.toString()}
                            </p>
                          </div>
                          <Badge variant="secondary">Pending</Badge>
                        </div>
                        
                        <p className="text-sm">{post.content}</p>
                        
                        {/* Display image if available */}
                        {post.image && (
                          <div className="rounded-lg overflow-hidden border">
                            <img 
                              src={post.image.getDirectURL()} 
                              alt="Post attachment" 
                              className="w-full max-h-64 object-contain bg-muted"
                            />
                          </div>
                        )}
                        
                        <div className="flex gap-2 pt-2">
                          <Button 
                            size="sm" 
                            variant="default" 
                            className="flex-1"
                            onClick={() => handleApprovePost(post.id)}
                            disabled={approvePostMutation.isPending}
                          >
                            {approvePostMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Approving...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            className="flex-1"
                            onClick={() => handleRejectPost(post.id)}
                            disabled={rejectPostMutation.isPending}
                          >
                            {rejectPostMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Rejecting...
                              </>
                            ) : (
                              <>
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manage Admins</CardTitle>
              <CardDescription>
                Promote community members to admin status. Maximum {maxAdmins} admins allowed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Current Admins */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Current Admins ({communityAdmins.length}/{maxAdmins})</h3>
                  {adminsLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    </div>
                  ) : communityAdmins.length === 0 ? (
                    <div className="text-center py-8">
                      <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No admins found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {communityAdmins.map((admin) => (
                        <Card key={admin.toString()} className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <img 
                                src="/assets/generated/default-avatar.dim_100x100.png" 
                                alt="Avatar" 
                                className="h-8 w-8 rounded-full"
                              />
                              <div>
                                <p className="font-medium text-sm">
                                  {admin.toString().slice(0, 12)}...
                                </p>
                                <p className="text-xs text-muted-foreground">Admin</p>
                              </div>
                            </div>
                            <Badge variant="secondary">
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Promote Members */}
                {communityAdmins.length < maxAdmins && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Promote Members</h3>
                    {membersLoading ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                      </div>
                    ) : promotableMembers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <UserPlus className="h-12 w-12 mx-auto mb-2" />
                        <p className="text-sm">No members available to promote</p>
                        <p className="text-xs mt-1">Approve join requests to add more members</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {promotableMembers.map((member) => (
                          <Card key={member.toString()} className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <img 
                                  src="/assets/generated/default-avatar.dim_100x100.png" 
                                  alt="Avatar" 
                                  className="h-8 w-8 rounded-full"
                                />
                                <div>
                                  <p className="font-medium text-sm">
                                    {member.toString().slice(0, 12)}...
                                  </p>
                                  <p className="text-xs text-muted-foreground">Member</p>
                                </div>
                              </div>
                              <Button 
                                size="sm" 
                                onClick={() => handlePromoteToAdmin(member)}
                                disabled={promoteToAdminMutation.isPending}
                              >
                                {promoteToAdminMutation.isPending ? (
                                  <>
                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                    Promoting...
                                  </>
                                ) : (
                                  <>
                                    <Shield className="mr-2 h-3 w-3" />
                                    Promote
                                  </>
                                )}
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

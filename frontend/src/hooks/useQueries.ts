import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { UserRole, Community, Post, JoinRequest } from '../backend';
import { Principal } from '@dfinity/principal';
import { ExternalBlob } from '../backend';

export interface UserProfile {
  fullName: string;
  username: string;
  age: number;
  country: string;
  village: string;
  city: string;
  address: string;
  mobile: string;
  email: string;
  language: 'english' | 'hindi' | 'gujarati';
}

// Define ApprovalStatus locally since it's not exported from backend
export type ApprovalStatus = 
  | { approved: null }
  | { pending: null }
  | { rejected: null };

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      const profile = await actor.getCallerUserProfile();
      if (!profile) return null;
      return {
        fullName: profile.fullName,
        username: profile.username,
        age: Number(profile.age),
        country: profile.country,
        village: profile.village,
        city: profile.city,
        address: profile.address,
        mobile: profile.mobile,
        email: profile.email,
        language: profile.language as 'english' | 'hindi' | 'gujarati',
      };
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      await actor.saveCallerUserProfile({
        fullName: profile.fullName,
        username: profile.username,
        age: BigInt(profile.age),
        country: profile.country,
        village: profile.village,
        city: profile.city,
        address: profile.address,
        mobile: profile.mobile,
        email: profile.email,
        language: { [profile.language]: null } as any,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useGetCallerUserRole() {
  const { actor, isFetching } = useActor();

  return useQuery<UserRole>({
    queryKey: ['userRole'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIsCallerApproved() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isApproved'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.isCallerApproved();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useRequestApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      await actor.requestApproval();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isApproved'] });
    },
  });
}

// Community Management Hooks
export function useGetAllCommunities() {
  const { actor, isFetching } = useActor();

  return useQuery<Community[]>({
    queryKey: ['communities'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAllCommunities();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateCommunity() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error('Actor not available');
      const communityId = await actor.createCommunity(name);
      return communityId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['userCommunities'] });
      queryClient.invalidateQueries({ queryKey: ['communityMembers'] });
    },
  });
}

// Get communities where user is a member (including admin)
export function useGetUserCommunities() {
  const { actor, isFetching } = useActor();
  const { data: allCommunities = [] } = useGetAllCommunities();

  return useQuery<Community[]>({
    queryKey: ['userCommunities'],
    queryFn: async () => {
      if (!actor || allCommunities.length === 0) return [];
      
      const userCommunities: Community[] = [];
      
      for (const community of allCommunities) {
        try {
          const members = await actor.getCommunityMembers(community.id);
          // This will throw if user is not a member, so if it succeeds, user is a member
          userCommunities.push(community);
        } catch (error) {
          // User is not a member of this community
        }
      }
      
      return userCommunities;
    },
    enabled: !!actor && !isFetching && allCommunities.length > 0,
  });
}

// Join Request Management
export function useRequestToJoinCommunity() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (communityId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      const requestId = await actor.requestToJoinCommunity(communityId);
      return requestId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['joinRequests'] });
    },
  });
}

export function useGetPendingJoinRequests(communityId: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<JoinRequest[]>({
    queryKey: ['pendingJoinRequests', communityId?.toString()],
    queryFn: async () => {
      if (!actor || !communityId) return [];
      return actor.getPendingJoinRequests(communityId);
    },
    enabled: !!actor && !isFetching && !!communityId,
  });
}

export function useApproveJoinRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      await actor.approveJoinRequest(requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingJoinRequests'] });
      queryClient.invalidateQueries({ queryKey: ['communityMembers'] });
    },
  });
}

export function useRejectJoinRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      await actor.rejectJoinRequest(requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingJoinRequests'] });
    },
  });
}

// Post Management Hooks
export function useCreatePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      content, 
      communityId, 
      image,
      onUploadProgress 
    }: { 
      content: string; 
      communityId: bigint;
      image?: File;
      onUploadProgress?: (percentage: number) => void;
    }) => {
      if (!actor) throw new Error('Actor not available');
      
      // If image is provided, use createPostWithImage
      if (image) {
        // Convert File to Uint8Array
        const arrayBuffer = await image.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Create ExternalBlob from bytes with upload progress tracking
        let externalBlob = ExternalBlob.fromBytes(uint8Array);
        
        // Add upload progress tracking if callback provided
        if (onUploadProgress) {
          externalBlob = externalBlob.withUploadProgress(onUploadProgress);
        }
        
        // Call backend with image
        const postId = await actor.createPostWithImage(content, communityId, externalBlob);
        return postId;
      } else {
        // No image, use regular createPost
        const postId = await actor.createPost(content, communityId);
        return postId;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['approvedPosts'] });
      queryClient.invalidateQueries({ queryKey: ['pendingPosts'] });
    },
  });
}

export function useGetAllApprovedPosts(communityId: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Post[]>({
    queryKey: ['approvedPosts', communityId?.toString()],
    queryFn: async () => {
      if (!actor || !communityId) return [];
      return actor.getAllApprovedPosts(communityId);
    },
    enabled: !!actor && !isFetching && !!communityId,
  });
}

export function useGetPendingPosts(communityId: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Post[]>({
    queryKey: ['pendingPosts', communityId?.toString()],
    queryFn: async () => {
      if (!actor || !communityId) return [];
      return actor.getPendingPosts(communityId);
    },
    enabled: !!actor && !isFetching && !!communityId,
  });
}

export function useApprovePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      await actor.approvePost(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['approvedPosts'] });
      queryClient.invalidateQueries({ queryKey: ['pendingPosts'] });
    },
  });
}

export function useRejectPost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      await actor.rejectPost(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['pendingPosts'] });
    },
  });
}

export function useDeletePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      await actor.deletePost(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['approvedPosts'] });
      queryClient.invalidateQueries({ queryKey: ['pendingPosts'] });
    },
  });
}

// Check if user is admin of a specific community
export function useIsCommunityAdmin(communityId: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isCommunityAdmin', communityId?.toString()],
    queryFn: async () => {
      if (!actor || !communityId) return false;
      
      try {
        const admins = await actor.getCommunityAdmins(communityId);
        // We need to check if current user is in the admins list
        // For now, we'll use a workaround by trying to get pending posts
        // If it succeeds, user is an admin
        await actor.getPendingPosts(communityId);
        return true;
      } catch (error) {
        return false;
      }
    },
    enabled: !!actor && !isFetching && !!communityId,
  });
}

// Get community admins
export function useGetCommunityAdmins(communityId: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Principal[]>({
    queryKey: ['communityAdmins', communityId?.toString()],
    queryFn: async () => {
      if (!actor || !communityId) return [];
      return actor.getCommunityAdmins(communityId);
    },
    enabled: !!actor && !isFetching && !!communityId,
  });
}

// Get community members
export function useGetCommunityMembers(communityId: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Principal[]>({
    queryKey: ['communityMembers', communityId?.toString()],
    queryFn: async () => {
      if (!actor || !communityId) return [];
      return actor.getCommunityMembers(communityId);
    },
    enabled: !!actor && !isFetching && !!communityId,
  });
}

// Promote member to admin
export function usePromoteToAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ communityId, userToPromote }: { communityId: bigint; userToPromote: Principal }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.promoteToAdmin(communityId, userToPromote);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['communityAdmins', variables.communityId.toString()] });
    },
  });
}

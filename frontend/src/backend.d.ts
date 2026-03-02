import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface JoinRequest {
    id: bigint;
    status: Variant_pending_approved_rejected;
    communityId: bigint;
    user: Principal;
    timestamp: bigint;
}
export interface UserApprovalInfo {
    status: ApprovalStatus;
    principal: Principal;
}
export interface Post {
    id: bigint;
    status: Variant_pending_approved;
    content: string;
    communityId: bigint;
    author: Principal;
    timestamp: bigint;
    image?: ExternalBlob;
}
export interface Community {
    id: bigint;
    name: string;
}
export interface UserProfile {
    age: bigint;
    country: string;
    username: string;
    city: string;
    fullName: string;
    email: string;
    language: Language;
    address: string;
    village: string;
    mobile: string;
}
export enum Language {
    hindi = "hindi",
    gujarati = "gujarati",
    english = "english"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_pending_approved {
    pending = "pending",
    approved = "approved"
}
export enum Variant_pending_approved_rejected {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export interface backendInterface {
    approveAllForCommunity(communityId: bigint): Promise<void>;
    approveJoinRequest(requestId: bigint): Promise<void>;
    approvePost(postId: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    clearSession(): Promise<void>;
    createCommunity(name: string): Promise<bigint>;
    createPost(content: string, communityId: bigint): Promise<bigint>;
    createPostWithImage(content: string, communityId: bigint, image: ExternalBlob): Promise<bigint>;
    deletePost(postId: bigint): Promise<void>;
    generateOTP(mobile: string): Promise<string>;
    getActiveSession(): Promise<string | null>;
    getAllApprovedPosts(communityId: bigint): Promise<Array<Post>>;
    getAllCommunities(): Promise<Array<Community>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCommunityAdmins(communityId: bigint): Promise<Array<Principal>>;
    getCommunityMembers(communityId: bigint): Promise<Array<Principal>>;
    getPendingJoinRequests(communityId: bigint): Promise<Array<JoinRequest>>;
    getPendingPosts(communityId: bigint): Promise<Array<Post>>;
    getPost(postId: bigint): Promise<Post | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    isCommunityAdmin(communityId: bigint, principal: Principal): Promise<boolean>;
    isSessionActive(): Promise<boolean>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    promoteToAdmin(communityId: bigint, userToPromote: Principal): Promise<void>;
    rejectJoinRequest(requestId: bigint): Promise<void>;
    rejectPost(postId: bigint): Promise<void>;
    requestApproval(): Promise<void>;
    requestToJoinCommunity(communityId: bigint): Promise<bigint>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    verifyOTP(mobile: string, otp: string): Promise<boolean>;
}

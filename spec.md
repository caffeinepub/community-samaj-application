# Community/Samaj Application

## Overview
A community platform where users can create or join communities, share posts, manage family trees, and interact with other members through a secure approval-based system.

## Authentication & User Management
- Mobile number-based authentication with OTP verification
- Each mobile number must create and maintain a completely separate, isolated user profile and session with strict data separation
- Login flow: User enters mobile number → System generates and returns 6-digit OTP → Backend response with OTP is clearly displayed to user in frontend (visible message or alert for testing purposes) → Clear OTP input field and "Verify" button appear → User enters OTP in dedicated input field → User clicks "Verify" button → Backend verifies OTP through `verifyOTP` endpoint → New unique session created on successful validation with fresh Principal generation for each distinct mobile number
- Two-step OTP verification interface: First step shows "Generate OTP" button, second step displays clear OTP input field with "Enter OTP" label and prominent "Verify" button with proper visual flow progression
- OTP input field and "Verify" button must be clearly visible and functional as a second step after OTP generation with intuitive user interface design
- Mobile number and OTP inputs are locked/disabled during verification process to prevent tampering
- Backend must reliably generate and return OTP when valid phone number is entered via `generateOTP` endpoint with clear response structure
- Frontend must correctly call `generateOTP` endpoint, receive the backend response, and prominently display the returned OTP to the user for testing (mock SMS mode)
- OTP verification handled through `verifyOTP` endpoint with automatic user login and account session initialization upon successful verification
- Upon successful OTP verification, user automatically advances to profile creation (for new users) or main dashboard (for existing users)
- Clear validation feedback during OTP entry with real-time input validation and proper error/success messaging
- Comprehensive success/error messages displayed to confirm whether verification succeeded or failed with specific feedback for different failure scenarios
- Each phone number can independently generate and verify its own OTP without conflicts
- Comprehensive error handling with user feedback for network errors, invalid OTPs, and failed generation attempts
- OTP sessions are properly scoped per mobile number, stored, verified, and cleared after successful login
- Smooth mobile-responsive design with clear visual flow between "Generate OTP" → "Enter OTP" → "Verify" steps
- User profiles store: Full Name, Username, Age, Country, Village, City, Address, Mobile, Email
- Profile editing and account deletion capabilities
- Each unique mobile number must generate its own distinct Principal identity - no Principal reuse across different phone numbers
- Backend must maintain strict `phoneToAccount` and `principalToPhone` mapping where each mobile number maps to exactly one unique Principal, preventing any cross-contamination
- Complete session isolation between different mobile numbers with mandatory session cleanup when switching phones
- After successful OTP verification, frontend shows confirmation message displaying the verified mobile number, then automatically creates or links a new independent profile for each newly verified phone number
- Profile setup modal must appear for every new mobile number after OTP verification confirmation, ensuring custom profile creation for each distinct phone
- Existing registered mobile numbers cannot access or view data from other accounts - strict validation prevents session reuse
- `activeSessions` must create independent session entries for each mobile number without overwriting previous accounts
- AccessControl state must assign unique user roles per Principal without mixing identities from different mobile numbers
- User profiles must be correctly bound to each unique Principal ensuring complete account separation
- Fresh Principal generation mandatory for each new mobile number login to ensure complete account isolation
- OTP verification logic must safely initialize new users with `#user` role only when they are not present in the access control state, without calling admin-restricted functions
- Existing admin roles remain untouched during new user initialization
- Clear cached profile data tied to old sessions upon logout or phone number change to prevent any cross-profile data leakage
- Thorough testing required to ensure logging in with different mobile numbers creates separate accounts without accessing previous user's profile data
- Keep displayed OTP visible for testing purposes with emphasis that SMS sending is not yet integrated

## Post-Login Landing Page
- After successful login and profile setup, all users see a simple landing page with only two options:
  - "Create Community" button
  - "Search Community" button
- No other navigation or features are accessible until the user creates or joins a community

## Community Management

### Community Creation
- Users can create new communities and automatically become administrators
- Community creators gain immediate access to their community with full member privileges plus admin capabilities
- Community name must be properly saved and persisted in backend storage
- Visual confirmation feedback (toast notification) displayed upon successful creation
- After creating a community, the admin is automatically taken inside the community view

### Community Search and Join
- Search functionality with real-time suggestions for finding communities by name
- When a user finds a community and clicks "Join", a join request is automatically sent to all admins of that community
- Join requests include the user's profile information for admin review
- Users must wait for admin approval before gaining community access

### Community Access
- Once inside a community (either as creator or approved member), users have access to all community features
- Community-specific navigation includes: Feed, My Family, Members, Create Post, Profile
- Admins see an additional "Admin Panel" option in the in-community navigation menu
- All community features are accessible only from within the community view

## Administrative System

### Admin Roles and Permissions
- Community creators automatically become administrators with immediate community access
- Admins can promote existing approved community members to admin status
- Maximum of 5 admins per community enforced by backend
- Attempts to exceed the 5-admin limit are rejected with appropriate error message
- Only existing admins can promote other members to admin roles

### Admin Panel (In-Community)
- Admin Panel is accessible only from within the community view, not from the main landing page
- Located in the in-community navigation menu, visible only to admins
- Contains sections for:
  - Pending join requests with approve/reject actions
  - Pending post approvals (only non-admin posts)
  - Member management and admin promotion interface
- Join request management shows user profile information with approve/reject buttons
- Approved users automatically gain full community member access
- Rejected users remain outside the community

### Admin Privileges
- Admin posts are published instantly without requiring approval
- Admins can approve or reject posts from regular members
- Admins can approve or reject join requests from prospective members
- Admins can promote approved members to admin status (subject to 5-admin limit)
- Admins have the same community access as regular members plus administrative capabilities

## Member Verification Flow
- When users request to join a community, a join request is sent to all community admins
- Users wait for admin approval before gaining community access
- Only approved members can enter the community and access its features
- Pending users cannot access any community content until approved

## Core Features (In-Community Access Only)

### Feed System
- Display posts from admin-approved content and direct admin posts
- Posts support text (500 character limit) and images (5MB limit)
- Like and comment functionality on posts
- Admin posts appear immediately without approval process
- Regular member posts require admin approval before appearing in feed
- Only approved community members can see and interact with feed content

### Family Tree Management
- Visual family tree display using block-tree style visualization
- Add family members through search functionality
- Invite system simulation for adding new family members
- Each user maintains their own family tree within the community context

### Members Directory
- Searchable and filterable member directory
- Filter options: Village, City, Name
- Each member profile displays their family tree
- Directory shows only approved community members
- Admins and regular members have equal access to member directory

### Post Creation
- Text posts with 500 character limit
- Optional image upload with 5MB size limit and proper validation
- Images are uploaded to blob storage canister using `_caffeineStorageCreateCertificate` and `_caffeineStorageRefillCashier` functions appropriately
- Backend `createPostWithImage` endpoint must properly handle, save, and connect uploaded image blob data to post entries
- Frontend React Query hooks send correct blob data payload to backend
- Image upload validation prevents posting without content or improperly loaded image files
- Upload progress indicator shows real-time image upload status with clear user feedback for upload progress, success, and errors
- Automatic retry mechanism for failed uploads due to network or storage gateway issues
- Success confirmation feedback when image is successfully uploaded and attached to post
- Comprehensive error handling with retry options for failed image uploads
- Admin posts are automatically approved and immediately visible in feed
- Regular member posts require admin approval before appearing in feed
- Posts have "Pending" status until approved (except for admin posts which are auto-approved)
- Images must properly render in feed and community dashboards after successful upload with immediate display upon upload and after page refresh
- Uploaded images are stored and retrieved correctly, and displayed along with text posts in both the feed and admin panel
- Frontend components (CreatePostPage and FeedPage) must correctly display post images using stored blob references
- Error handling and confirmation ensures images appear immediately upon upload and persist after browser refresh

### User Profile Management
- View and edit personal profile information within community context
- Manage own posts (view approved and pending posts)
- Logout and account deletion options

## Data Storage Requirements

### Backend Data Storage
- User profiles and mobile-based authentication data with mandatory unique Principal generation per phone number and complete session isolation with zero cross-profile data leakage
- Reliable OTP generation, storage, and verification tracking with strict mobile number to Principal mapping ensuring each phone gets exactly one unique identity
- Proper OTP session management with storage, verification, and cleanup after successful login
- Robust `phoneToAccount` and `principalToPhone` mapping that prevents Principal reuse and maintains one-to-one mobile-to-Principal relationships
- Independent session management in `activeSessions` where each mobile number creates its own session entry without overwriting existing accounts
- AccessControl state management that safely assigns user roles per unique Principal without identity mixing
- Community information with persistent names and membership records
- Join requests with pending/approved/rejected status tracking
- Member verification states and community membership records
- Posts with approval status and metadata (admin posts are auto-approved)
- Image storage using blob storage canister with proper hash/URL references linked to posts via Storage.ExternalBlob
- Family tree relationships and member connections
- Comments and likes on posts
- Admin permissions and community settings with multi-admin support (maximum 5 admins per community)
- Community-specific data for in-community features
- Admin identification system for instant post approval and join request management
- Proper image blob connection to post entries ensuring uploaded images are saved and retrievable
- Access control state that safely assigns `#user` role to new users without admin function calls
- Secure user role initialization that preserves existing admin privileges

### Performance Requirements
- Image optimization for fast loading
- Smooth UI transitions and responsive design
- Fast search and filtering capabilities for community search
- Real-time content updates within communities
- Reliable data persistence for community membership and admin status
- Immediate post approval and visibility for admin posts
- Fast and secure OTP generation with clear backend response structure and frontend display for testing purposes
- Automatic user login and session initialization upon successful OTP verification
- Reliable OTP generation with proper backend response and frontend display
- Robust error handling and retry logic for OTP generation failures with clear user feedback
- Efficient session cleanup and validation preventing any cross-account data access when switching mobile numbers
- Efficient join request processing and notification system
- Proper image upload progress tracking with failure detection and automatic retry functionality
- Reliable image storage and retrieval from blob storage canister with proper blob reference management
- Accurate image rendering in feed and dashboard components with error handling
- Robust image upload system with network failure recovery and user feedback
- Immediate image display upon successful upload and persistence after page refresh
- Secure and efficient user role assignment during OTP verification without authorization conflicts
- Thorough account isolation testing to ensure different mobile numbers create completely separate user experiences
- Fast OTP verification with proper input validation and error handling for empty, incorrect, or expired OTPs with clear validation feedback
- Smooth user flow from OTP verification to profile creation or dashboard with mobile-responsive design
- Real-time validation feedback during OTP entry with immediate error/success messaging

## Navigation Structure

### Landing Page Navigation
- Simple two-option interface: "Create Community" and "Search Community"
- No other navigation elements until community access is gained

### In-Community Navigation
Available only after entering a community (as creator or approved member):
1. Feed - Community posts and interactions
2. My Family - Family tree management
3. Members - Community member directory
4. Create Post - Content creation with reliable image upload capabilities
5. Profile - Personal account management
6. Admin Panel - Administrative interface (visible only to admins of that community)

## User Experience Enhancements
- Success toast notifications for community creation and join request submissions
- Visual feedback for all critical user actions
- Clear display of generated OTP in frontend for testing purposes with prominent visibility (message or alert)
- Two-step OTP verification interface with clear visual progression from "Generate OTP" to "Enter OTP" with prominent "Verify" button
- Clear OTP input field and "Verify" button appear immediately after OTP generation with intuitive user interface design
- Mobile number and OTP inputs locked during verification to prevent tampering
- Automatic user login and session initialization after successful OTP verification
- Automatic advancement to profile creation or dashboard based on user status after verification
- Clear validation feedback during OTP entry with real-time input validation and comprehensive success/error messages
- Specific feedback for different verification failure scenarios (incorrect OTP, expired OTP, network errors)
- Confirmation message showing verified mobile number before automatic profile creation or linking
- Comprehensive user feedback for invalid OTPs and verification failures with actionable error messages
- Retry functionality for OTP generation failures with user-friendly error messages
- Smooth mobile-responsive design with clear visual flow between authentication steps
- Consistent data persistence across browser sessions with mandatory session isolation and zero cross-profile contamination between different mobile numbers
- Automatic profile creation or linking for each newly verified phone number after successful OTP verification
- Clear validation preventing registered mobile numbers from accessing other users' data
- Loading states for community search and join operations
- Clear status indicators for join request approval process
- Immediate UI updates when users are promoted to admin status
- Clear error messaging when admin promotion limits are reached
- Instant visibility of admin posts in feed without approval delay
- Smooth transition from landing page to community access after approval
- Clear pending status indicators for join requests in Admin Panel
- Comprehensive image upload progress indicators with success/error feedback and automatic retry functionality
- Validation messages for post creation requirements
- Proper image display in feed and community dashboard with error fallbacks and retry mechanisms
- Real-time upload status updates with failure detection and user notifications
- Automatic retry system for failed image uploads with clear user feedback
- Reliable image upload system with network failure recovery and progress tracking
- Immediate confirmation when images are successfully uploaded and connected to posts
- Proper error handling for OTP verification that prevents unauthorized role assignment errors
- Clear user feedback during login process with secure role initialization
- Thorough testing validation that different mobile numbers create completely separate accounts without cross-contamination
- Emphasis that SMS sending is not yet integrated but OTP display is for testing purposes

## Language
- Application content language: English

import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import UserApproval "user-approval/approval";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import Array "mo:core/Array";
import Time "mo:core/Time";

actor {
  include MixinStorage();

  // Core Types
  public type Language = { #english; #hindi; #gujarati };

  public type Community = {
    id : Nat;
    name : Text;
  };

  public type CommunityMember = {
    principal : Principal;
    name : Text;
    country : Text;
    village : Text;
    city : Text;
    address : Text;
    mobile : Text;
    status : { #active; #suspended; #deleted };
    email : Text;
    alive : Bool;
    self : Bool;
    partnerPrincipalId : ?Principal;
    partnerName : ?Text;
    partnerGender : ?Text;
    married : Bool;
    father : ?Principal;
    mother : ?Principal;
    rootId : ?Principal;
    children : [Principal];
    family : ?Principal;
    authProvider : ?Text;
    isFamilyHead : Bool;
    familyName : ?Text;
    gender : ?Text;
  };

  public type DirectoryFilter = {
    filterType : { #city : Text; #village : Text; #country : Text };
  };

  public type Post = {
    id : Nat;
    author : Principal;
    content : Text;
    communityId : Nat;
    status : { #pending; #approved };
    timestamp : Nat;
    image : ?Storage.ExternalBlob;
  };

  public type JoinRequest = {
    id : Nat;
    user : Principal;
    communityId : Nat;
    status : { #pending; #approved; #rejected };
    timestamp : Nat;
  };

  public type ApprovalStatus = UserApproval.ApprovalStatus;

  public type UserProfile = {
    fullName : Text;
    username : Text;
    age : Nat;
    country : Text;
    village : Text;
    city : Text;
    address : Text;
    mobile : Text;
    email : Text;
    language : Language;
  };

  public type OTPSession = {
    mobile : Text;
    otp : Text;
    principal : Principal;
    timestamp : Int;
    verified : Bool;
  };

  public type PhoneAuthMapping = {
    mobile : Text;
    principal : Principal;
    lastLogin : Int;
  };

  // State variables
  var communities = Map.empty<Nat, Community>();
  var communityMembers = Map.empty<Text, List.List<CommunityMember>>();
  var posts = Map.empty<Nat, Post>();
  var realmUsers = Map.empty<Principal, { principal : Principal; joinedCommunities : [Nat] }>();
  var families = Map.empty<Principal, { id : ?Nat; name : ?Text; head : Principal }>();
  var userProfiles = Map.empty<Principal, UserProfile>();
  var communityAdmins = Map.empty<Nat, Set.Set<Principal>>();
  var communityMembership = Map.empty<Nat, Set.Set<Principal>>();
  var joinRequests = Map.empty<Nat, JoinRequest>();
  var postIdCounter = 1;
  var nextCommunityId = 1;
  var nextJoinRequestId = 1;
  let approvedUsers = Map.empty<Principal, Bool>();

  // Phone-based authentication state
  var otpSessions = Map.empty<Principal, OTPSession>();
  var phoneToAccount = Map.empty<Text, Principal>();
  var activeSessions = Map.empty<Principal, Text>(); // Principal -> mobile number
  var principalToPhone = Map.empty<Principal, Text>(); // Reverse mapping for validation

  // Access control state, required by MixinAuthorization
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User approval state
  let approvalState = UserApproval.initState(accessControlState);

  // Phone Authentication Functions
  // Note: This function allows guest/anonymous access since users need to generate OTP before authentication
  public shared ({ caller }) func generateOTP(mobile : Text) : async Text {
    // No authorization check - guests/anonymous users must be able to generate OTP
    
    if (mobile.size() < 10) {
      Runtime.trap("Invalid mobile number format.");
    };

    // Check if this mobile is already registered to a different Principal
    switch (phoneToAccount.get(mobile)) {
      case (?existingPrincipal) {
        if (existingPrincipal != caller) {
          Runtime.trap("This mobile number is already registered to another account. Please use a different number or login with the correct session.");
        };
      };
      case (null) {
        // Check if this Principal is already bound to a different phone
        switch (principalToPhone.get(caller)) {
          case (?existingPhone) {
            if (existingPhone != mobile) {
              Runtime.trap("This session is already bound to a different mobile number. Please clear your session first.");
            };
          };
          case (null) {};
        };
      };
    };

    let otp = await generateRandomOTP();

    let session : OTPSession = {
      mobile = mobile;
      otp = otp;
      principal = caller;
      timestamp = Time.now();
      verified = false;
    };

    otpSessions.add(caller, session);

    // Return OTP for display (mocked SMS delivery)
    otp;
  };

  // Note: This function allows guest/anonymous access since users need to verify OTP before authentication
  public shared ({ caller }) func verifyOTP(mobile : Text, otp : Text) : async Bool {
    // No authorization check - guests/anonymous users must be able to verify OTP
    
    switch (otpSessions.get(caller)) {
      case (?session) {
        if (session.mobile != mobile) {
          Runtime.trap("Mobile number mismatch.");
        };

        if (session.otp != otp) {
          return false;
        };

        let currentTime = Time.now();
        let otpAge = currentTime - session.timestamp;
        if (otpAge > 600_000_000_000) { // 10 minutes in nanoseconds
          Runtime.trap("OTP has expired.");
        };

        // Critical: Enforce one-to-one mapping between phone and Principal
        switch (phoneToAccount.get(mobile)) {
          case (?existingPrincipal) {
            // This phone is already registered
            if (existingPrincipal != caller) {
              Runtime.trap("This mobile number is already registered to another account. Cannot reuse phone numbers across different sessions.");
            };
            // Same Principal, same phone - valid re-login
          };
          case (null) {
            // New phone number registration
            // Check if this Principal is already bound to a different phone
            switch (principalToPhone.get(caller)) {
              case (?existingPhone) {
                if (existingPhone != mobile) {
                  Runtime.trap("This session is already bound to mobile number: " # existingPhone # ". Cannot bind one session to multiple phone numbers.");
                };
              };
              case (null) {
                // New Principal, new phone - establish binding
                phoneToAccount.add(mobile, caller);
                principalToPhone.add(caller, mobile);
              };
            };
          };
        };

        // Mark session as verified
        let verifiedSession : OTPSession = {
          mobile = session.mobile;
          otp = session.otp;
          principal = caller;
          timestamp = session.timestamp;
          verified = true;
        };
        otpSessions.add(caller, verifiedSession);

        // Update active session
        activeSessions.add(caller, mobile);

        // Initialize user role ONLY if not already assigned (safe for new users)
        let currentRole = AccessControl.getUserRole(accessControlState, caller);
        switch (currentRole) {
          case (#guest) {
            // New user - assign user role to themselves
            // This is safe because we're assigning the role to the caller themselves
            AccessControl.assignRole(accessControlState, caller, caller, #user);
          };
          case (_) {
            // User already has a role (user or admin) - preserve it
          };
        };

        true;
      };
      case (null) {
        Runtime.trap("No OTP session found. Please generate OTP first.");
      };
    };
  };

  public shared ({ caller }) func clearSession() : async () {
    // Authorization: Only authenticated users can clear their own sessions
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can clear sessions.");
    };

    // Validate caller has an active session before clearing
    switch (activeSessions.get(caller)) {
      case (?mobile) {
        // Clear session data
        otpSessions.remove(caller);
        activeSessions.remove(caller);

        // Note: We do NOT remove phoneToAccount or principalToPhone mappings
        // These permanent bindings ensure each phone stays bound to its original Principal
        // This prevents phone number reuse across different Principals
      };
      case (null) {
        // No active session to clear - this is acceptable, no error needed
      };
    };
  };

  public query ({ caller }) func getActiveSession() : async ?Text {
    // Authorization: Only authenticated users can check their session
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can check session status.");
    };

    // Validate session belongs to caller
    switch (activeSessions.get(caller)) {
      case (?mobile) {
        // Double-check the phone-to-principal binding
        switch (phoneToAccount.get(mobile)) {
          case (?boundPrincipal) {
            if (boundPrincipal == caller) {
              ?mobile;
            } else {
              null; // Session mismatch
            };
          };
          case (null) { null };
        };
      };
      case (null) { null };
    };
  };

  public query ({ caller }) func isSessionActive() : async Bool {
    // Authorization: Only authenticated users can check their session status
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can check session status.");
    };

    switch (activeSessions.get(caller)) {
      case (?mobile) {
        // Validate the session integrity
        switch (phoneToAccount.get(mobile)) {
          case (?boundPrincipal) {
            boundPrincipal == caller;
          };
          case (null) { false };
        };
      };
      case (null) { false };
    };
  };

  func generateRandomOTP() : async Text {
    let now = Time.now();
    let timestamp = now % 1000000;
    let paddedOtp = timestamp + 100000;
    paddedOtp.toText();
  };

  // Helper function to validate session ownership
  func validateSessionOwnership(caller : Principal) : Bool {
    switch (activeSessions.get(caller)) {
      case (?mobile) {
        switch (phoneToAccount.get(mobile)) {
          case (?boundPrincipal) {
            boundPrincipal == caller;
          };
          case (null) { false };
        };
      };
      case (null) { false };
    };
  };

  // User Profile Management Functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    // Authorization: Only authenticated users can access profiles
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can access this function.");
    };

    if (not validateSessionOwnership(caller)) {
      Runtime.trap("No active session or session integrity violation. Please login again.");
    };

    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    // Authorization: Only authenticated users can view profiles
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can access this function.");
    };

    if (not validateSessionOwnership(caller)) {
      Runtime.trap("No active session or session integrity violation. Please login again.");
    };

    // Users can always view their own profile
    if (caller == user) {
      return userProfiles.get(user);
    };

    // Check if caller is an admin in any community where the target user is a member
    var canViewProfile = false;
    for ((communityId, members) in communityMembership.entries()) {
      if (members.contains(user) and isCommunityAdminHelper(communityId, caller)) {
        canViewProfile := true;
      };
    };

    if (not canViewProfile) {
      Runtime.trap("Unauthorized: Can only view your own profile or profiles of members in communities you admin.");
    };

    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    // Authorization: Only authenticated users can save profiles
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can save profiles.");
    };

    // Strict session validation
    if (not validateSessionOwnership(caller)) {
      Runtime.trap("No active session or session integrity violation. Please login again.");
    };

    // Critical: Validate profile mobile matches the caller's bound phone number
    switch (principalToPhone.get(caller)) {
      case (?boundMobile) {
        if (profile.mobile != boundMobile) {
          Runtime.trap("Profile mobile number must match your authenticated phone number: " # boundMobile);
        };
      };
      case (null) {
        Runtime.trap("No phone number bound to this session. Please complete OTP verification first.");
      };
    };

    // Additional validation: ensure the phone in profile matches active session
    switch (activeSessions.get(caller)) {
      case (?sessionMobile) {
        if (profile.mobile != sessionMobile) {
          Runtime.trap("Profile mobile number must match authenticated session mobile number.");
        };
      };
      case (null) {
        Runtime.trap("No active session. Please login again.");
      };
    };

    let isValid = validateProfile(profile);
    if (not isValid) {
      Runtime.trap("Validation failed: All required fields must be provided with valid values.");
    };

    userProfiles.add(caller, profile);

    switch (userProfiles.get(caller)) {
      case (?_) {
        if (not (approvedUsers.containsKey(caller))) {
          UserApproval.setApproval(approvalState, caller, #approved);
          approvedUsers.add(caller, true);
        };
      };
      case null {
        Runtime.trap("Failed to save user profile.");
      };
    };
  };

  func validateProfile(profile : UserProfile) : Bool {
    profile.fullName.size() > 0 and
    profile.username.size() > 0 and
    profile.age > 0 and
    profile.country.size() > 0 and
    profile.village.size() > 0 and
    profile.city.size() > 0 and
    profile.address.size() > 0 and
    profile.mobile.size() > 0 and
    profile.email.size() > 0
  };

  // Approval System Functions
  public query ({ caller }) func isCallerApproved() : async Bool {
    // Authorization: Only authenticated users can check approval status
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can check approval status.");
    };

    if (not validateSessionOwnership(caller)) {
      Runtime.trap("No active session or session integrity violation. Please login again.");
    };

    AccessControl.hasPermission(accessControlState, caller, #admin) or UserApproval.isApproved(approvalState, caller);
  };

  public shared ({ caller }) func requestApproval() : async () {
    // Authorization: Only authenticated users can request approval
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can request approval.");
    };

    if (not validateSessionOwnership(caller)) {
      Runtime.trap("No active session or session integrity violation. Please login again.");
    };

    UserApproval.requestApproval(approvalState, caller);
  };

  public shared ({ caller }) func setApproval(user : Principal, status : UserApproval.ApprovalStatus) : async () {
    // Authorization: Only admins can set approval status
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can set approval status.");
    };

    UserApproval.setApproval(approvalState, user, status);

    switch (status) {
      case (#approved) { approvedUsers.add(user, true) };
      case (_) { approvedUsers.remove(user) };
    };
  };

  public query ({ caller }) func listApprovals() : async [UserApproval.UserApprovalInfo] {
    // Authorization: Only admins can list approvals
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can list approvals.");
    };
    UserApproval.listApprovals(approvalState);
  };

  // Community Management Functions
  public shared ({ caller }) func createCommunity(name : Text) : async Nat {
    // Authorization: Only authenticated users can create communities
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can create communities.");
    };

    if (not validateSessionOwnership(caller)) {
      Runtime.trap("No active session or session integrity violation. Please login again.");
    };

    if (not (UserApproval.isApproved(approvalState, caller))) {
      Runtime.trap("Unauthorized: Only approved users can create communities.");
    };

    if (name.size() == 0) {
      Runtime.trap("Community name cannot be empty.");
    };

    let communityId = nextCommunityId;
    let community : Community = {
      id = communityId;
      name;
    };

    communities.add(communityId, community);

    // Creator becomes admin
    let adminsSet = Set.empty<Principal>();
    adminsSet.add(caller);
    communityAdmins.add(communityId, adminsSet);

    // Creator becomes member
    let membersSet = Set.empty<Principal>();
    membersSet.add(caller);
    communityMembership.add(communityId, membersSet);

    nextCommunityId += 1;
    communityId;
  };

  public query ({ caller }) func getAllCommunities() : async [Community] {
    // Authorization: Only authenticated users can view communities
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can view communities.");
    };

    if (not validateSessionOwnership(caller)) {
      Runtime.trap("No active session or session integrity violation. Please login again.");
    };

    communities.values().toArray();
  };

  // Join Request Management Functions
  public shared ({ caller }) func requestToJoinCommunity(communityId : Nat) : async Nat {
    // Authorization: Only authenticated users can request to join communities
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can request to join communities.");
    };

    if (not validateSessionOwnership(caller)) {
      Runtime.trap("No active session or session integrity violation. Please login again.");
    };

    if (not (UserApproval.isApproved(approvalState, caller))) {
      Runtime.trap("Unauthorized: Only approved users can request to join communities.");
    };

    switch (communities.get(communityId)) {
      case (null) { Runtime.trap("Community not found.") };
      case (?_) {
        if (isCommunityMember(communityId, caller)) {
          Runtime.trap("You are already a member of this community.");
        };

        // Check for existing pending request
        for ((id, request) in joinRequests.entries()) {
          if (request.user == caller and request.communityId == communityId and request.status == #pending) {
            Runtime.trap("You already have a pending join request for this community.");
          };
        };

        let requestId = nextJoinRequestId;
        let joinRequest : JoinRequest = {
          id = requestId;
          user = caller;
          communityId;
          status = #pending;
          timestamp = 0;
        };

        joinRequests.add(requestId, joinRequest);
        nextJoinRequestId += 1;
        requestId;
      };
    };
  };

  public shared ({ caller }) func approveJoinRequest(requestId : Nat) : async () {
    // Authorization: Only authenticated users can approve join requests (admin check below)
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can approve join requests.");
    };

    if (not validateSessionOwnership(caller)) {
      Runtime.trap("No active session or session integrity violation. Please login again.");
    };

    switch (joinRequests.get(requestId)) {
      case (null) { Runtime.trap("Join request not found.") };
      case (?request) {
        // Authorization: Only community admins can approve join requests
        if (not (isCommunityAdminHelper(request.communityId, caller))) {
          Runtime.trap("Unauthorized: Only community admins can approve join requests.");
        };

        if (request.status != #pending) {
          Runtime.trap("This join request has already been processed.");
        };

        let updatedRequest : JoinRequest = {
          id = request.id;
          user = request.user;
          communityId = request.communityId;
          status = #approved;
          timestamp = request.timestamp;
        };
        joinRequests.add(requestId, updatedRequest);

        // Add user to community membership
        switch (communityMembership.get(request.communityId)) {
          case (?members) {
            members.add(request.user);
          };
          case (null) {
            let newMembers = Set.empty<Principal>();
            newMembers.add(request.user);
            communityMembership.add(request.communityId, newMembers);
          };
        };
      };
    };
  };

  public shared ({ caller }) func rejectJoinRequest(requestId : Nat) : async () {
    // Authorization: Only authenticated users can reject join requests (admin check below)
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can reject join requests.");
    };

    if (not validateSessionOwnership(caller)) {
      Runtime.trap("No active session or session integrity violation. Please login again.");
    };

    switch (joinRequests.get(requestId)) {
      case (null) { Runtime.trap("Join request not found.") };
      case (?request) {
        // Authorization: Only community admins can reject join requests
        if (not (isCommunityAdminHelper(request.communityId, caller))) {
          Runtime.trap("Unauthorized: Only community admins can reject join requests.");
        };

        if (request.status != #pending) {
          Runtime.trap("This join request has already been processed.");
        };

        let updatedRequest : JoinRequest = {
          id = request.id;
          user = request.user;
          communityId = request.communityId;
          status = #rejected;
          timestamp = request.timestamp;
        };
        joinRequests.add(requestId, updatedRequest);
      };
    };
  };

  public query ({ caller }) func getPendingJoinRequests(communityId : Nat) : async [JoinRequest] {
    // Authorization: Only authenticated users can view join requests (admin check below)
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can view join requests.");
    };

    if (not validateSessionOwnership(caller)) {
      Runtime.trap("No active session or session integrity violation. Please login again.");
    };

    // Authorization: Only community admins can view join requests
    if (not (isCommunityAdminHelper(communityId, caller))) {
      Runtime.trap("Unauthorized: Only community admins can view join requests.");
    };

    joinRequests.values().filter(
      func(request) {
        request.communityId == communityId and request.status == #pending;
      }
    ).toArray();
  };

  // Admin Promotion Functions
  public shared ({ caller }) func promoteToAdmin(communityId : Nat, userToPromote : Principal) : async () {
    // Authorization: Only authenticated users can promote members (admin check below)
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can promote members.");
    };

    if (not validateSessionOwnership(caller)) {
      Runtime.trap("No active session or session integrity violation. Please login again.");
    };

    // Authorization: Only community admins can promote members to admin
    if (not (isCommunityAdminHelper(communityId, caller))) {
      Runtime.trap("Unauthorized: Only community admins can promote members to admin.");
    };

    if (not (isCommunityMember(communityId, userToPromote))) {
      Runtime.trap("User must be a community member before being promoted to admin.");
    };

    switch (communityAdmins.get(communityId)) {
      case (?admins) {
        if (admins.contains(userToPromote)) {
          Runtime.trap("User is already an admin of this community.");
        };

        if (admins.size() >= 5) {
          Runtime.trap("Maximum of 5 admins per community reached.");
        };

        admins.add(userToPromote);
      };
      case (null) {
        Runtime.trap("Community not found.");
      };
    };
  };

  public query ({ caller }) func getCommunityAdmins(communityId : Nat) : async [Principal] {
    // Authorization: Only authenticated users can view admin list (membership check below)
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can view admin list.");
    };

    if (not validateSessionOwnership(caller)) {
      Runtime.trap("No active session or session integrity violation. Please login again.");
    };

    // Authorization: Only community members can view admin list
    if (not (isCommunityMember(communityId, caller))) {
      Runtime.trap("Unauthorized: Only community members can view admin list.");
    };

    switch (communityAdmins.get(communityId)) {
      case (?admins) { admins.toArray() };
      case (null) { [] };
    };
  };

  // Member Management Functions
  public query ({ caller }) func getCommunityMembers(communityId : Nat) : async [Principal] {
    // Authorization: Only authenticated users can view member list (membership check below)
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can view member list.");
    };

    if (not validateSessionOwnership(caller)) {
      Runtime.trap("No active session or session integrity violation. Please login again.");
    };

    // Authorization: Only community members can view member list
    if (not (isCommunityMember(communityId, caller))) {
      Runtime.trap("Unauthorized: Only community members can view member list.");
    };

    switch (communityMembership.get(communityId)) {
      case (?members) { members.toArray() };
      case (null) { [] };
    };
  };

  // Post Management Functions
  public shared ({ caller }) func createPost(content : Text, communityId : Nat) : async Nat {
    // Authorization: Only authenticated users can create posts
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can create posts.");
    };

    if (not validateSessionOwnership(caller)) {
      Runtime.trap("No active session or session integrity violation. Please login again.");
    };

    if (not (UserApproval.isApproved(approvalState, caller))) {
      Runtime.trap("Unauthorized: Only approved users can create posts.");
    };
    
    // Authorization: Only community members can create posts
    if (not (isCommunityMember(communityId, caller))) {
      Runtime.trap("Unauthorized: Only community members can create posts.");
    };

    if (content.size() == 0) {
      Runtime.trap("Post content cannot be empty.");
    };

    if (content.size() > 500) {
      Runtime.trap("Post content exceeds 500 character limit.");
    };

    let isAdmin = isCommunityAdminHelper(communityId, caller);

    let post : Post = {
      id = postIdCounter;
      author = caller;
      content;
      communityId;
      status = if (isAdmin) { #approved } else { #pending };
      timestamp = 0;
      image = null;
    };

    posts.add(postIdCounter, post);
    postIdCounter += 1;
    post.id;
  };

  public shared ({ caller }) func createPostWithImage(content : Text, communityId : Nat, image : Storage.ExternalBlob) : async Nat {
    // Authorization: Only authenticated users can create posts
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can create posts.");
    };

    if (not validateSessionOwnership(caller)) {
      Runtime.trap("No active session or session integrity violation. Please login again.");
    };

    if (not (UserApproval.isApproved(approvalState, caller))) {
      Runtime.trap("Unauthorized: Only approved users can create posts.");
    };
    
    // Authorization: Only community members can create posts
    if (not (isCommunityMember(communityId, caller))) {
      Runtime.trap("Unauthorized: Only community members can create posts.");
    };

    if (content.size() > 500) {
      Runtime.trap("Post content exceeds 500 character limit.");
    };

    let isAdmin = isCommunityAdminHelper(communityId, caller);

    let post : Post = {
      id = postIdCounter;
      author = caller;
      content;
      communityId;
      status = if (isAdmin) { #approved } else { #pending };
      timestamp = 0;
      image = ?image;
    };

    posts.add(postIdCounter, post);
    postIdCounter += 1;
    post.id;
  };

  public shared ({ caller }) func approvePost(postId : Nat) : async () {
    // Authorization: Only authenticated users can approve posts (admin check below)
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can approve posts.");
    };

    if (not validateSessionOwnership(caller)) {
      Runtime.trap("No active session or session integrity violation. Please login again.");
    };

    switch (posts.get(postId)) {
      case (?post) {
        // Authorization: Only community admins can approve posts
        if (not (isCommunityAdminHelper(post.communityId, caller))) {
          Runtime.trap("Unauthorized: Only community admins can approve posts.");
        };

        if (post.status == #approved) {
          Runtime.trap("Post is already approved.");
        };

        let updatedPost : Post = {
          id = post.id;
          author = post.author;
          content = post.content;
          communityId = post.communityId;
          status = #approved;
          timestamp = post.timestamp;
          image = post.image;
        };
        posts.add(postId, updatedPost);
      };
      case (_) { Runtime.trap("Post not found."); };
    };
  };

  public shared ({ caller }) func rejectPost(postId : Nat) : async () {
    // Authorization: Only authenticated users can reject posts (admin check below)
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can reject posts.");
    };

    if (not validateSessionOwnership(caller)) {
      Runtime.trap("No active session or session integrity violation. Please login again.");
    };

    switch (posts.get(postId)) {
      case (?post) {
        // Authorization: Only community admins can reject posts
        if (not (isCommunityAdminHelper(post.communityId, caller))) {
          Runtime.trap("Unauthorized: Only community admins can reject posts.");
        };
        posts.remove(postId);
      };
      case (_) { Runtime.trap("Post not found."); };
    };
  };

  public shared ({ caller }) func approveAllForCommunity(communityId : Nat) : async () {
    // Authorization: Only authenticated users can approve posts (admin check below)
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can approve posts.");
    };

    if (not validateSessionOwnership(caller)) {
      Runtime.trap("No active session or session integrity violation. Please login again.");
    };

    // Authorization: Only community admins can approve posts for this community
    if (not (isCommunityAdminHelper(communityId, caller))) {
      Runtime.trap("Unauthorized: Only community admins can approve posts for this community.");
    };

    for ((id, post) in posts.entries()) {
      if (post.communityId == communityId and post.status == #pending) {
        let updatedPost : Post = {
          id = post.id;
          author = post.author;
          content = post.content;
          communityId = post.communityId;
          status = #approved;
          timestamp = post.timestamp;
          image = post.image;
        };
        posts.add(id, updatedPost);
      };
    };
  };

  public shared ({ caller }) func deletePost(postId : Nat) : async () {
    // Authorization: Only authenticated users can delete posts
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can delete posts.");
    };

    if (not validateSessionOwnership(caller)) {
      Runtime.trap("No active session or session integrity violation. Please login again.");
    };

    switch (posts.get(postId)) {
      case (?post) {
        let isAuthor = post.author == caller;
        let isAdmin = isCommunityAdminHelper(post.communityId, caller);

        // Authorization: Only the post author or community admins can delete this post
        if (not (isAuthor or isAdmin)) {
          Runtime.trap("Unauthorized: Only the post author or community admins can delete this post.");
        };

        posts.remove(postId);
      };
      case (_) { Runtime.trap("Post not found."); };
    };
  };

  public query ({ caller }) func getPost(postId : Nat) : async ?Post {
    // Authorization: Only authenticated users can view posts
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can view posts.");
    };

    if (not validateSessionOwnership(caller)) {
      Runtime.trap("No active session or session integrity violation. Please login again.");
    };

    switch (posts.get(postId)) {
      case (?post) {
        // Authorization: Only community members can view posts
        if (not (isCommunityMember(post.communityId, caller))) {
          Runtime.trap("Unauthorized: Only community members can view posts.");
        };
        ?post;
      };
      case (null) { null };
    };
  };

  public query ({ caller }) func getAllApprovedPosts(communityId : Nat) : async [Post] {
    // Authorization: Only authenticated users can view posts
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can view posts.");
    };

    if (not validateSessionOwnership(caller)) {
      Runtime.trap("No active session or session integrity violation. Please login again.");
    };

    // Authorization: Only community members can view posts
    if (not (isCommunityMember(communityId, caller))) {
      Runtime.trap("Unauthorized: Only community members can view posts.");
    };

    switch (communities.get(communityId)) {
      case (?_) {
        posts.values().filter(
          func(post) {
            post.communityId == communityId and post.status == #approved;
          }
        ).toArray();
      };
      case (null) {
        Runtime.trap("Community not found.");
      };
    };
  };

  public query ({ caller }) func getPendingPosts(communityId : Nat) : async [Post] {
    // Authorization: Only authenticated users can view pending posts (admin check below)
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can view pending posts.");
    };

    if (not validateSessionOwnership(caller)) {
      Runtime.trap("No active session or session integrity violation. Please login again.");
    };

    // Authorization: Only community admins can view pending posts
    if (not (isCommunityAdminHelper(communityId, caller))) {
      Runtime.trap("Unauthorized: Only community admins can view pending posts.");
    };

    posts.values().filter(
      func(post) {
        post.communityId == communityId and post.status == #pending;
      }
    ).toArray();
  };

  // Helper functions to check admin/member status
  public query ({ caller }) func isCommunityAdmin(communityId : Nat, principal : Principal) : async Bool {
    // Authorization: Only authenticated users can check admin status
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can check admin status.");
    };

    if (not validateSessionOwnership(caller)) {
      Runtime.trap("No active session or session integrity violation. Please login again.");
    };

    isCommunityAdminHelper(communityId, principal);
  };

  func isCommunityAdminHelper(communityId : Nat, principal : Principal) : Bool {
    switch (communityAdmins.get(communityId)) {
      case (?admins) { admins.contains(principal) };
      case (null) { false };
    };
  };

  func isCommunityMember(communityId : Nat, principal : Principal) : Bool {
    switch (communityMembership.get(communityId)) {
      case (?members) { members.contains(principal) };
      case (null) { false };
    };
  };
};

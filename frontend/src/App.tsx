import { useEffect, useState } from 'react';
import { useOTPAuth } from './hooks/useOTPAuth';
import { useGetCallerUserProfile } from './hooks/useQueries';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { RouterProvider, createRouter, createRootRoute, createRoute } from '@tanstack/react-router';
import LoginPage from './pages/LoginPage';
import ProfileSetupModal from './components/ProfileSetupModal';
import MainLayout from './components/MainLayout';
import FeedPage from './pages/FeedPage';
import FamilyPage from './pages/FamilyPage';
import MembersPage from './pages/MembersPage';
import CreatePostPage from './pages/CreatePostPage';
import ProfilePage from './pages/ProfilePage';
import CommunityDashboard from './pages/CommunityDashboard';
import CommunitySelectionPage from './pages/CommunitySelectionPage';

// Create root route with MainLayout
const rootRoute = createRootRoute({
  component: MainLayout,
});

// Create child routes
const communitySelectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: CommunitySelectionPage,
});

const feedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/feed',
  component: FeedPage,
});

const familyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/family',
  component: FamilyPage,
});

const membersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/members',
  component: MembersPage,
});

const createPostRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/create-post',
  component: CreatePostPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: ProfilePage,
});

const communityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/community/$communityId',
  component: CommunityDashboard,
});

// Create route tree
const routeTree = rootRoute.addChildren([
  communitySelectionRoute,
  feedRoute,
  familyRoute,
  membersRoute,
  createPostRoute,
  profileRoute,
  communityRoute,
]);

// Create router
const router = createRouter({ routeTree });

// Declare router type for TypeScript
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  const { isAuthenticated, isInitializing, syncWithBackend, backendPhoneNumber } = useOTPAuth();
  const { data: userProfile, isLoading: profileLoading, isFetched, refetch: refetchProfile } = useGetCallerUserProfile();
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  // Sync frontend with backend session on mount
  useEffect(() => {
    if (!isInitializing) {
      syncWithBackend();
    }
  }, [isInitializing, syncWithBackend]);

  // Determine if profile setup should be shown
  useEffect(() => {
    if (isAuthenticated && !profileLoading && isFetched) {
      // Profile is null means user needs to set up profile
      setShowProfileSetup(userProfile === null);
    } else {
      setShowProfileSetup(false);
    }
  }, [isAuthenticated, profileLoading, isFetched, userProfile]);

  // Refetch profile when authentication changes or phone number changes
  useEffect(() => {
    if (isAuthenticated && !isInitializing) {
      refetchProfile();
    }
  }, [isAuthenticated, isInitializing, backendPhoneNumber, refetchProfile]);

  if (isInitializing) {
    return (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <LoginPage />
        <Toaster />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      {showProfileSetup ? (
        <ProfileSetupModal 
          onComplete={() => {
            setShowProfileSetup(false);
            refetchProfile();
          }} 
        />
      ) : (
        <RouterProvider router={router} />
      )}
      <Toaster />
    </ThemeProvider>
  );
}

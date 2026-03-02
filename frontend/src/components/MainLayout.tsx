import { Home, Users, UserPlus, PlusCircle, User, Shield } from 'lucide-react';
import { useNavigate, useRouterState, Outlet } from '@tanstack/react-router';
import { useGetUserCommunities } from '../hooks/useQueries';
import Header from './Header';
import Footer from './Footer';

export default function MainLayout() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const { data: userCommunities = [] } = useGetUserCommunities();
  
  // Determine active tab based on current path
  const pathname = routerState.location.pathname;
  const activeTab = pathname === '/feed' ? 'feed' 
    : pathname.startsWith('/family') ? 'family'
    : pathname.startsWith('/members') ? 'members'
    : pathname.startsWith('/create-post') ? 'createPost'
    : pathname.startsWith('/profile') ? 'profile'
    : 'none';

  // Check if user has joined or created any community
  const hasJoinedCommunity = userCommunities.length > 0;
  
  // Show navigation only if user has joined/created a community and not on community selection page
  const showNavigation = hasJoinedCommunity && pathname !== '/';

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />
      
      <main className={`flex-1 overflow-y-auto ${showNavigation ? 'pb-20' : ''}`}>
        <Outlet />
      </main>

      {/* Bottom Navigation - Only show if user has joined/created a community */}
      {showNavigation && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
          <div className="flex justify-around items-center h-16 max-w-screen-xl mx-auto px-2">
            <button
              onClick={() => navigate({ to: '/feed' })}
              className={`flex flex-col items-center justify-center h-full px-3 transition-colors ${
                activeTab === 'feed' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Home className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">Feed</span>
            </button>

            <button
              onClick={() => navigate({ to: '/family' })}
              className={`flex flex-col items-center justify-center h-full px-3 transition-colors ${
                activeTab === 'family' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <UserPlus className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">My Family</span>
            </button>

            <button
              onClick={() => navigate({ to: '/members' })}
              className={`flex flex-col items-center justify-center h-full px-3 transition-colors ${
                activeTab === 'members' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Users className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">Members</span>
            </button>

            <button
              onClick={() => navigate({ to: '/create-post' })}
              className={`flex flex-col items-center justify-center h-full px-3 transition-colors ${
                activeTab === 'createPost' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <PlusCircle className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">Create Post</span>
            </button>

            <button
              onClick={() => navigate({ to: '/profile' })}
              className={`flex flex-col items-center justify-center h-full px-3 transition-colors ${
                activeTab === 'profile' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <User className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">Profile</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

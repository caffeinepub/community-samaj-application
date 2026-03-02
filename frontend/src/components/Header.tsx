import { useOTPAuth } from '../hooks/useOTPAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Header() {
  const { phoneNumber, backendPhoneNumber, logout, isLoggingOut } = useOTPAuth();

  // Use backend phone as source of truth
  const displayPhone = backendPhoneNumber || phoneNumber;

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully', {
        description: 'Your session has been cleared',
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout', {
        description: 'Please try again',
      });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img 
            src="/assets/generated/community-logo-transparent.dim_200x200.png" 
            alt="Community Logo" 
            className="h-10 w-10"
          />
          <div>
            <h1 className="text-lg font-bold">Community</h1>
            {displayPhone && (
              <p className="text-xs text-muted-foreground">{displayPhone}</p>
            )}
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="gap-2"
        >
          {isLoggingOut ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Logging out...
            </>
          ) : (
            <>
              <LogOut className="h-4 w-4" />
              Logout
            </>
          )}
        </Button>
      </div>
    </header>
  );
}

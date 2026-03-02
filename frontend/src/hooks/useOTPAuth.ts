import { create } from 'zustand';
import { useActor } from './useActor';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface OTPAuthState {
  currentPhoneNumber: string | null;
  isVerified: boolean;
  setPhoneNumber: (phone: string | null) => void;
  setVerified: (verified: boolean) => void;
  clearAuth: () => void;
}

// Simple in-memory store (no persistence to avoid stale session issues)
const useOTPAuthStore = create<OTPAuthState>((set) => ({
  currentPhoneNumber: null,
  isVerified: false,

  setPhoneNumber: (phone: string | null) => {
    set({ currentPhoneNumber: phone, isVerified: false });
  },

  setVerified: (verified: boolean) => {
    set({ isVerified: verified });
  },

  clearAuth: () => {
    set({ currentPhoneNumber: null, isVerified: false });
  },
}));

// Hook for OTP authentication with backend integration
export const useOTPAuth = () => {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const store = useOTPAuthStore();

  // Check if session is active on backend
  const { data: backendSessionActive, isLoading: checkingSession, refetch: refetchSessionStatus } = useQuery({
    queryKey: ['backendSession'],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await actor.isSessionActive();
      } catch (error) {
        console.error('Error checking session status:', error);
        return false;
      }
    },
    enabled: !!actor,
    refetchInterval: 30000, // Check every 30 seconds
    retry: 1,
  });

  // Get active session from backend
  const { data: backendPhoneNumber, refetch: refetchActiveSession } = useQuery({
    queryKey: ['activeSession'],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getActiveSession();
      } catch (error) {
        console.error('Error fetching active session:', error);
        return null;
      }
    },
    enabled: !!actor,
    retry: 1,
  });

  // Sync frontend state with backend session
  const syncWithBackend = async () => {
    if (!actor) return;
    
    try {
      const isActive = await actor.isSessionActive();
      const activePhone = await actor.getActiveSession();
      
      if (isActive && activePhone) {
        // Backend has active session
        if (store.currentPhoneNumber !== activePhone) {
          // Update frontend to match backend
          store.setPhoneNumber(activePhone);
          store.setVerified(true);
        }
      } else {
        // No backend session, clear frontend
        if (store.isVerified) {
          store.clearAuth();
        }
      }
    } catch (error) {
      console.error('Error syncing with backend:', error);
      // Error checking backend, clear frontend state
      store.clearAuth();
    }
  };

  // Generate OTP mutation
  const generateOTPMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      if (!actor) throw new Error('Actor not available');
      
      // Clear any existing frontend state before generating new OTP
      store.clearAuth();
      queryClient.clear();
      
      try {
        const otp = await actor.generateOTP(phoneNumber);
        return otp;
      } catch (error: any) {
        console.error('Backend generateOTP error:', error);
        // Re-throw with more context
        if (error.message) {
          throw new Error(error.message);
        }
        throw new Error('Failed to generate OTP. Please try again.');
      }
    },
    onSuccess: (_, phoneNumber) => {
      store.setPhoneNumber(phoneNumber);
    },
    onError: (error: any) => {
      console.error('Generate OTP mutation error:', error);
      store.clearAuth();
    },
  });

  // Verify OTP mutation
  const verifyOTPMutation = useMutation({
    mutationFn: async ({ phoneNumber, otp }: { phoneNumber: string; otp: string }) => {
      if (!actor) throw new Error('Actor not available');
      
      try {
        const isValid = await actor.verifyOTP(phoneNumber, otp);
        return { isValid, phoneNumber };
      } catch (error: any) {
        console.error('Backend verifyOTP error:', error);
        // Re-throw with more context
        if (error.message) {
          throw new Error(error.message);
        }
        throw new Error('Failed to verify OTP. Please try again.');
      }
    },
    onSuccess: async ({ isValid, phoneNumber }) => {
      if (isValid) {
        // Mark as verified in frontend
        store.setPhoneNumber(phoneNumber);
        store.setVerified(true);
        
        // Clear all cached data to force fresh fetch with new session
        queryClient.clear();
        
        // Refetch session status
        await refetchSessionStatus();
        await refetchActiveSession();
        
        // Invalidate specific queries to trigger refetch
        queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
        queryClient.invalidateQueries({ queryKey: ['backendSession'] });
        queryClient.invalidateQueries({ queryKey: ['activeSession'] });
      }
    },
    onError: (error: any) => {
      console.error('Verify OTP mutation error:', error);
    },
  });

  // Clear session mutation
  const clearSessionMutation = useMutation({
    mutationFn: async () => {
      if (!actor) return;
      try {
        await actor.clearSession();
      } catch (error: any) {
        console.error('Backend clearSession error:', error);
        // Even if backend fails, clear frontend state
      }
    },
    onSuccess: () => {
      // Clear frontend state
      store.clearAuth();
      
      // Clear all cached data
      queryClient.clear();
      
      // Refetch to confirm session cleared
      refetchSessionStatus();
      refetchActiveSession();
    },
    onError: (error: any) => {
      console.error('Clear session mutation error:', error);
      // Still clear frontend state even on error
      store.clearAuth();
      queryClient.clear();
    },
  });

  // Determine authentication status
  // User is authenticated only if:
  // 1. Frontend state shows verified
  // 2. Backend confirms session is active
  // 3. Phone numbers match between frontend and backend
  const isAuthenticated = 
    store.isVerified && 
    (backendSessionActive ?? false) && 
    store.currentPhoneNumber === backendPhoneNumber;

  return {
    phoneNumber: store.currentPhoneNumber,
    isAuthenticated,
    isInitializing: checkingSession,
    backendPhoneNumber,
    
    setPhoneNumber: store.setPhoneNumber,
    syncWithBackend,
    
    generateOTP: async (phoneNumber: string) => {
      try {
        return await generateOTPMutation.mutateAsync(phoneNumber);
      } catch (error: any) {
        // Ensure error is properly propagated
        throw error;
      }
    },
    
    verifyOTP: async (phoneNumber: string, otp: string) => {
      try {
        const result = await verifyOTPMutation.mutateAsync({ phoneNumber, otp });
        return result.isValid;
      } catch (error: any) {
        // Ensure error is properly propagated
        throw error;
      }
    },
    
    logout: async () => {
      try {
        await clearSessionMutation.mutateAsync();
      } catch (error: any) {
        console.error('Logout error:', error);
        // Still clear frontend state
        store.clearAuth();
        queryClient.clear();
      }
    },
    
    isGeneratingOTP: generateOTPMutation.isPending,
    isVerifyingOTP: verifyOTPMutation.isPending,
    isLoggingOut: clearSessionMutation.isPending,
  };
};

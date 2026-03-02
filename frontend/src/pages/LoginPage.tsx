import { useState } from 'react';
import { useOTPAuth } from '../hooks/useOTPAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Smartphone, Lock, ArrowRight, Loader2, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  const { generateOTP, verifyOTP, isGeneratingOTP, isVerifyingOTP } = useOTPAuth();
  const [step, setStep] = useState<'phone' | 'otp' | 'verified'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [displayedOTP, setDisplayedOTP] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid mobile number (at least 10 digits)');
      return;
    }

    try {
      const generatedCode = await generateOTP(phoneNumber);
      
      if (!generatedCode) {
        throw new Error('No OTP received from server. Please try again.');
      }
      
      if (generatedCode.length !== 6) {
        throw new Error('Invalid OTP format received from server. Please try again.');
      }
      
      setDisplayedOTP(generatedCode);
      setStep('otp');
      setRetryCount(0);
      toast.success('OTP Generated Successfully!', {
        description: `Your verification code is: ${generatedCode}`,
        duration: 5000,
      });
    } catch (error: any) {
      console.error('Failed to generate OTP:', error);
      let errorMessage = 'Failed to generate OTP. Please try again.';
      
      if (error.message) {
        if (error.message.includes('Invalid mobile number')) {
          errorMessage = 'Invalid mobile number format. Please check and try again.';
        } else if (error.message.includes('already registered')) {
          errorMessage = error.message;
        } else if (error.message.includes('already bound')) {
          errorMessage = error.message;
        } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('No OTP received')) {
          errorMessage = error.message;
        } else if (error.message.includes('Invalid OTP format')) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      toast.error('Failed to Generate OTP', {
        description: errorMessage,
      });
    }
  };

  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!otp || otp.trim() === '') {
      setError('Please enter the OTP code');
      toast.error('OTP Required', {
        description: 'Please enter the 6-digit verification code',
      });
      return;
    }
    
    if (otp.length !== 6) {
      setError('Please enter a complete 6-digit OTP');
      toast.error('Incomplete OTP', {
        description: 'Please enter all 6 digits',
      });
      return;
    }

    try {
      const isValid = await verifyOTP(phoneNumber, otp);
      if (isValid) {
        setVerifiedPhone(phoneNumber);
        setStep('verified');
        toast.success('OTP Verified Successfully!', {
          description: `Account verified for ${phoneNumber}`,
          duration: 3000,
        });
        // Automatic login happens in the background via useOTPAuth
        // App.tsx will handle the transition to profile setup or main app
      } else {
        setError('Invalid OTP code. Please check and try again.');
        toast.error('Invalid OTP', {
          description: 'The code you entered is incorrect. Please try again.',
        });
        setOtp('');
      }
    } catch (error: any) {
      console.error('Verification failed:', error);
      let errorMessage = 'Verification failed. Please try again.';
      
      if (error.message) {
        if (error.message.includes('Mobile number mismatch')) {
          errorMessage = 'Session error. Please restart the login process.';
          setStep('phone');
          setDisplayedOTP(null);
          setOtp('');
        } else if (error.message.includes('expired')) {
          errorMessage = 'OTP has expired. Please request a new code.';
        } else if (error.message.includes('No OTP session')) {
          errorMessage = 'Session expired. Please generate a new OTP.';
          setStep('phone');
          setDisplayedOTP(null);
          setOtp('');
        } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      toast.error('Verification Failed', {
        description: errorMessage,
      });
      
      if (!error.message?.includes('Mobile number mismatch') && !error.message?.includes('No OTP session')) {
        setOtp('');
      }
    }
  };

  const handleResendOTP = async () => {
    setError(null);
    
    if (retryCount >= 5) {
      setError('Maximum retry attempts reached. Please wait a few minutes before trying again.');
      toast.error('Too Many Attempts', {
        description: 'Please wait a few minutes before requesting a new OTP.',
      });
      return;
    }
    
    try {
      const generatedCode = await generateOTP(phoneNumber);
      
      if (!generatedCode) {
        throw new Error('No OTP received from server. Please try again.');
      }
      
      if (generatedCode.length !== 6) {
        throw new Error('Invalid OTP format received from server. Please try again.');
      }
      
      setDisplayedOTP(generatedCode);
      setOtp('');
      setRetryCount(prev => prev + 1);
      toast.success('New OTP Generated!', {
        description: `Your new verification code is: ${generatedCode}`,
        duration: 5000,
      });
    } catch (error: any) {
      console.error('Failed to resend OTP:', error);
      let errorMessage = 'Failed to resend OTP. Please try again.';
      
      if (error.message) {
        if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('No OTP received')) {
          errorMessage = error.message;
        } else if (error.message.includes('Invalid OTP format')) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      toast.error('Failed to Resend OTP', {
        description: errorMessage,
      });
    }
  };

  const handleChangeNumber = () => {
    setStep('phone');
    setOtp('');
    setDisplayedOTP(null);
    setError(null);
    setRetryCount(0);
    setVerifiedPhone(null);
  };

  const isLoading = isGeneratingOTP || isVerifyingOTP;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="text-center space-y-3 sm:space-y-4">
            <img 
              src="/assets/generated/community-logo-transparent.dim_200x200.png" 
              alt="Community Logo" 
              className="h-24 w-24 sm:h-32 sm:w-32 mx-auto"
            />
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Welcome to Community
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground">
              Connect with your community members
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Phone Number Input */}
          {step === 'phone' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Smartphone className="h-5 w-5" />
                  Step 1: Enter Mobile Number
                </CardTitle>
                <CardDescription>
                  Each phone number creates a unique, isolated account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Mobile Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter your mobile number"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        setError(null);
                      }}
                      disabled={isLoading}
                      className="text-base sm:text-lg"
                      autoComplete="tel"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter at least 10 digits
                    </p>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={isLoading || !phoneNumber || phoneNumber.length < 10}
                  >
                    {isGeneratingOTP ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generating OTP...
                      </>
                    ) : (
                      <>
                        Generate OTP
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Step 2: OTP Verification */}
          {step === 'otp' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Lock className="h-5 w-5" />
                  Step 2: Verify OTP
                </CardTitle>
                <CardDescription>
                  Enter the 6-digit code for {phoneNumber}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                {/* Display generated OTP prominently for testing */}
                {displayedOTP && (
                  <Alert className="border-2 border-primary bg-primary/5">
                    <div className="flex flex-col sm:flex-row items-start gap-3">
                      <img 
                        src="/assets/generated/otp-verification-screen.dim_400x300.png" 
                        alt="OTP" 
                        className="h-16 w-16 flex-shrink-0 mx-auto sm:mx-0"
                      />
                      <div className="flex-1 w-full">
                        <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start">
                          <AlertCircle className="h-4 w-4 text-primary" />
                          <p className="text-sm font-semibold text-primary">Your OTP Code (Testing Mode)</p>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3 text-center sm:text-left">
                          Backend Response: Use this code to verify your account. SMS sending not yet integrated.
                        </p>
                        <div className="bg-background rounded-lg p-3 sm:p-4 border-2 border-primary/30">
                          <p className="text-3xl sm:text-4xl font-bold text-center tracking-[0.3em] sm:tracking-[0.5em] text-primary font-mono">
                            {displayedOTP}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Alert>
                )}

                {/* Locked mobile number display */}
                <div className="space-y-2">
                  <Label htmlFor="locked-phone">Mobile Number (Locked)</Label>
                  <Input
                    id="locked-phone"
                    type="tel"
                    value={phoneNumber}
                    disabled={true}
                    className="text-base sm:text-lg bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">
                    Mobile number is locked during verification
                  </p>
                </div>

                {/* OTP Input and Verify Button */}
                <form onSubmit={handleOTPVerify} className="space-y-4">
                  <div className="space-y-3">
                    <Label htmlFor="otp" className="text-center block font-semibold text-base">
                      Enter OTP
                    </Label>
                    <div className="flex justify-center">
                      <InputOTP 
                        maxLength={6} 
                        value={otp}
                        onChange={(value) => {
                          setOtp(value);
                          setError(null);
                        }}
                        disabled={isLoading}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} className="w-10 h-12 sm:w-12 sm:h-14 text-lg sm:text-xl" />
                          <InputOTPSlot index={1} className="w-10 h-12 sm:w-12 sm:h-14 text-lg sm:text-xl" />
                          <InputOTPSlot index={2} className="w-10 h-12 sm:w-12 sm:h-14 text-lg sm:text-xl" />
                          <InputOTPSlot index={3} className="w-10 h-12 sm:w-12 sm:h-14 text-lg sm:text-xl" />
                          <InputOTPSlot index={4} className="w-10 h-12 sm:w-12 sm:h-14 text-lg sm:text-xl" />
                          <InputOTPSlot index={5} className="w-10 h-12 sm:w-12 sm:h-14 text-lg sm:text-xl" />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <div className="text-center">
                      {otp.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Enter the 6-digit code above</p>
                      ) : otp.length === 6 ? (
                        <p className="text-sm text-green-600 font-medium flex items-center justify-center gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          Ready to verify
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Enter {6 - otp.length} more digit{6 - otp.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={isLoading || otp.length !== 6}
                  >
                    {isVerifyingOTP ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Verify
                      </>
                    )}
                  </Button>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleChangeNumber}
                      disabled={isLoading}
                      className="w-full sm:w-auto"
                    >
                      Change Number
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResendOTP}
                      disabled={isLoading || retryCount >= 5}
                      className="gap-1 w-full sm:w-auto"
                    >
                      {isGeneratingOTP ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Resending...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Resend OTP {retryCount > 0 && `(${retryCount}/5)`}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Verification Success */}
          {step === 'verified' && (
            <Card className="border-2 border-green-500/50 bg-green-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600 text-lg sm:text-xl">
                  <CheckCircle2 className="h-6 w-6" />
                  Verification Successful!
                </CardTitle>
                <CardDescription>
                  Your account has been verified
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-background rounded-lg p-4 border-2 border-green-500/30">
                  <p className="text-sm text-muted-foreground mb-2 text-center">Verified Mobile Number:</p>
                  <p className="text-xl sm:text-2xl font-bold text-center text-green-600">
                    {verifiedPhone}
                  </p>
                </div>
                
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Initializing your account...
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Please wait while we set up your profile
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info Text */}
          <div className="text-center text-xs sm:text-sm text-muted-foreground space-y-2 px-2">
            <p>
              Each mobile number creates a completely separate account with its own data.
            </p>
            <p className="text-xs">
              Your OTP is valid for 10 minutes. SMS sending is not yet integrated - OTP is displayed for testing.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 sm:py-6 text-center text-xs sm:text-sm text-muted-foreground px-4">
        <p className="flex items-center justify-center gap-1 flex-wrap">
          © 2025. Built with <span className="text-red-500">♥</span> using{' '}
          <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}

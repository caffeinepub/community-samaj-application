import { useState, useEffect } from 'react';
import { useSaveCallerUserProfile } from '../hooks/useQueries';
import { useOTPAuth } from '../hooks/useOTPAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProfileSetupModalProps {
  onComplete: () => void;
}

export default function ProfileSetupModal({ onComplete }: ProfileSetupModalProps) {
  const saveProfile = useSaveCallerUserProfile();
  const { phoneNumber, backendPhoneNumber } = useOTPAuth();
  
  // Use backend phone number as source of truth
  const authenticatedPhone = backendPhoneNumber || phoneNumber || '';
  
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    age: '',
    country: '',
    village: '',
    city: '',
    address: '',
    mobile: authenticatedPhone,
    email: '',
  });

  // Update mobile field when authenticated phone changes
  useEffect(() => {
    if (authenticatedPhone) {
      setFormData(prev => ({ ...prev, mobile: authenticatedPhone }));
    }
  }, [authenticatedPhone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.fullName || !formData.username || !formData.age || !formData.mobile) {
      toast.error('Please fill in all required fields', {
        description: 'Full Name, Username, Age, and Mobile Number are required',
      });
      return;
    }

    // Validate mobile number matches authenticated session
    if (authenticatedPhone && formData.mobile !== authenticatedPhone) {
      toast.error('Mobile number must match your authenticated number', {
        description: `Please use ${authenticatedPhone}`,
      });
      return;
    }

    // Validate all fields are filled (backend requirement)
    if (!formData.country || !formData.village || !formData.city || !formData.address || !formData.email) {
      toast.error('All fields are required', {
        description: 'Please fill in all the information',
      });
      return;
    }

    // Validate age
    const ageNum = parseInt(formData.age);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 150) {
      toast.error('Invalid age', {
        description: 'Please enter a valid age between 1 and 150',
      });
      return;
    }

    try {
      await saveProfile.mutateAsync({
        ...formData,
        age: ageNum,
        language: 'english',
      });
      toast.success('Profile created successfully', {
        description: 'Welcome to the community!',
      });
      onComplete();
    } catch (error: any) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to create profile', {
        description: error.message || 'Please try again',
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="text-center mb-6 space-y-4">
          <div className="flex items-center justify-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold">Complete Your Profile</h2>
          
          <Alert className="border-2 border-primary/30 bg-primary/5">
            <Smartphone className="h-4 w-4" />
            <AlertDescription className="text-left">
              <p className="font-semibold mb-1">Account Verified Successfully!</p>
              <p className="text-sm">
                Creating profile for mobile number: <span className="font-bold text-primary">{authenticatedPhone}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This profile is unique to your phone number and completely isolated from other accounts.
              </p>
            </AlertDescription>
          </Alert>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                disabled={saveProfile.isPending}
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                disabled={saveProfile.isPending}
                placeholder="Choose a username"
              />
            </div>

            <div>
              <Label htmlFor="age">Age *</Label>
              <Input
                id="age"
                type="number"
                min="1"
                max="150"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                required
                disabled={saveProfile.isPending}
                placeholder="Enter your age"
              />
            </div>

            <div>
              <Label htmlFor="mobile">Mobile Number *</Label>
              <Input
                id="mobile"
                value={formData.mobile}
                disabled={true}
                className="bg-muted cursor-not-allowed"
                title="Mobile number is locked to your authenticated session"
              />
              <p className="text-xs text-muted-foreground mt-1">
                🔒 Locked to verified number
              </p>
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={saveProfile.isPending}
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                required
                disabled={saveProfile.isPending}
                placeholder="Enter your country"
              />
            </div>

            <div>
              <Label htmlFor="village">Village *</Label>
              <Input
                id="village"
                value={formData.village}
                onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                required
                disabled={saveProfile.isPending}
                placeholder="Enter your village"
              />
            </div>

            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
                disabled={saveProfile.isPending}
                placeholder="Enter your city"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
              disabled={saveProfile.isPending}
              placeholder="Enter your full address"
            />
          </div>

          <div className="pt-4 border-t">
            <Button type="submit" className="w-full" size="lg" disabled={saveProfile.isPending}>
              {saveProfile.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating Profile...
                </>
              ) : (
                'Create Profile'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

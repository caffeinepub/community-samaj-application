import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';

export default function FamilyPage() {
  // Mock data - will be replaced with actual backend data
  const familyMembers = [];

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Family Tree</h1>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Member
        </Button>
      </div>

      {familyMembers.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <img 
                src="/assets/generated/no-family-illustration.dim_400x300.png" 
                alt="No family members" 
                className="h-48 mx-auto opacity-50"
              />
              <h3 className="text-xl font-semibold">No family members yet</h3>
              <p className="text-muted-foreground">Start building your family tree</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Family tree visualization will go here */}
        </div>
      )}
    </div>
  );
}

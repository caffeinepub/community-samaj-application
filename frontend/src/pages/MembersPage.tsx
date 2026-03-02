import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function MembersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'city' | 'village' | 'country'>('all');

  // Mock data - will be replaced with actual backend data
  const members = [];

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">Members Directory</h1>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search members..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setFilterType('all')}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterType('city')}>City</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterType('village')}>Village</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterType('country')}>Country</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {members.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <img 
                src="/assets/generated/members-icon.dim_64x64.png" 
                alt="No members" 
                className="h-24 mx-auto opacity-50"
              />
              <h3 className="text-xl font-semibold">No members found</h3>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map((member: any) => (
            <Card key={member.principal}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <img 
                    src="/assets/generated/default-avatar.dim_100x100.png" 
                    alt="Avatar" 
                    className="h-12 w-12 rounded-full"
                  />
                  <div>
                    <p className="font-semibold">{member.fullName}</p>
                    <p className="text-sm text-muted-foreground">{member.city}, {member.country}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

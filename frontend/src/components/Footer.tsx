import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t bg-card py-6 mt-auto">
      <div className="container px-4 text-center text-sm text-muted-foreground">
        <p className="flex items-center justify-center gap-1">
          © 2025. Built with <Heart className="h-4 w-4 text-red-500 fill-red-500" /> using{' '}
          <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            caffeine.ai
          </a>
        </p>
      </div>
    </footer>
  );
}

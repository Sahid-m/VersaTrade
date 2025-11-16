'use client';

import { Button } from '@/components/ui/button';
import { signInWithGoogle, signOut } from '@/firebase/auth';
import { useUser } from '@/hooks/use-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogIn, LogOut } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { useAuth } from '@/firebase';
import { getRandomNftAvatar } from '@/lib/nfts';
import { useState, useEffect } from 'react';

const CUSTOM_AVATAR_EMAIL = "adithyapraveen.work@gmail.com";
const CUSTOM_AVATAR_URL = "https://firebasestorage.googleapis.com/v0/b/firebase-st-v-2-backend-9395518541-698f2.appspot.com/o/2d-pixel-art-boy-face_8829-2810.avif?alt=media";

export function AuthButton() {
  const { user, isLoading } = useUser();
  const auth = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      if (user.email === CUSTOM_AVATAR_EMAIL) {
        setAvatarUrl(CUSTOM_AVATAR_URL);
        return;
      }
      // Use photoURL from Google first, then check for custom avatar, then set a new random one
      const existingAvatar = localStorage.getItem(`avatar_${user.uid}`);
      if (user.photoURL) {
        setAvatarUrl(user.photoURL);
      } else if (existingAvatar) {
        setAvatarUrl(existingAvatar);
      } else {
        const newAvatar = getRandomNftAvatar();
        localStorage.setItem(`avatar_${user.uid}`, newAvatar);
        setAvatarUrl(newAvatar);
      }
    }
  }, [user]);


  if (isLoading) {
    return <Skeleton className="h-10 w-24" />;
  }

  if (!user) {
    return (
      <Button onClick={() => signInWithGoogle(auth)}>
        <LogIn className="mr-2 h-4 w-4" />
        Login with Google
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={user.displayName || 'User'} />}
            <AvatarFallback>
              {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut(auth)}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { useState, useEffect } from "react";
import { Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { useAnnouncement } from "@/hooks/use-announcement";
import { RoleBadge } from "@/components/role-badge";
import { HamburgerMenuTrigger } from "@/components/hamburger-menu";
import { Link } from "wouter";
import { useBackgroundMusic } from "@/components/background-music";

// Fake online user count hook
function useFakeOnlineCount() {
  const [count, setCount] = useState(() => Math.floor(Math.random() * 50) + 120);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => {
        const change = Math.floor(Math.random() * 7) - 3;
        return Math.max(100, Math.min(200, prev + change));
      });
    }, 15000);
    return () => clearInterval(interval);
  }, []);
  
  return count;
}

export function TopBar() {
  const [isDark, setIsDark] = useState(true);
  const [topOffset, setTopOffset] = useState(16);
  const [isMuted, setIsMuted] = useState(false);
  const { hasAnnouncement } = useAnnouncement();
  const { youtubeId } = useBackgroundMusic();
  const { user, isAuthenticated, logout } = useAuth();
  const onlineCount = useFakeOnlineCount();

  useEffect(() => {
    setTopOffset(hasAnnouncement ? 56 : 16);
  }, [hasAnnouncement]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setIsDark(savedTheme === "dark");
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
    document.documentElement.classList.toggle("dark", newTheme);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    const iframe = document.querySelector('iframe[src*="youtube.com"]') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: isMuted ? 'unMute' : 'mute' }),
        '*'
      );
    }
  };

  return (
    <>
      <header
        className="fixed left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-primary/30 shadow-lg transition-all duration-300"
        style={{ top: `${topOffset}px` }}
      >
        <div className="container mx-auto px-2 sm:px-4 h-12 sm:h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <HamburgerMenuTrigger />
            <Link href="/">
              <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary via-yellow-500 to-primary bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity">
                REHA.COM
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {isAuthenticated && (
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 border border-primary/30">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-primary">{onlineCount} online</span>
              </div>
            )}

            {youtubeId && (
              <Button
                variant="outline"
                size="icon"
                onClick={toggleMute}
                className="bg-background/95 border-primary/50 shadow-lg hover:bg-primary/20 w-8 h-8 sm:w-9 sm:h-9"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                ) : (
                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                )}
              </Button>
            )}

            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="bg-background/95 border-primary/50 shadow-lg hover:bg-primary/20 w-8 h-8 sm:w-9 sm:h-9"
              data-testid="button-theme-toggle"
            >
              {isDark ? (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              ) : (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              )}
            </Button>

            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-background/95 border-primary/50 shadow-lg hover:bg-primary/20 p-0 overflow-hidden w-8 h-8 sm:w-9 sm:h-9"
                    data-testid="button-profile-menu"
                  >
                    <Avatar className="w-8 h-8 sm:w-9 sm:h-9">
                      <AvatarImage src={user?.avatar || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs sm:text-sm font-semibold">
                        {user?.displayName?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium leading-none">{user?.displayName}</p>
                        {user?.role && <RoleBadge role={user.role as any} />}
                      </div>
                      <p className="text-xs leading-none text-muted-foreground">
                        @{user?.username}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">
                      <span className="cursor-pointer w-full">Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <span className="cursor-pointer w-full">Ayarlar</span>
                    </Link>
                  </DropdownMenuItem>
                  {(user?.role === "ADMIN" || user?.role === "MOD") && (
                    <>
                      <DropdownMenuSeparator />
                      {user?.role === "ADMIN" && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin">
                            <span className="cursor-pointer w-full text-primary">Admin Panel</span>
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link href="/management">
                          <span className="cursor-pointer w-full text-blue-500">Yönetim</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    Çıkış Yap
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {!isAuthenticated && (
              <Link href="/login">
                <Button
                  variant="default"
                  size="sm"
                  className="gold-gradient text-black font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                  Giriş Yap
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

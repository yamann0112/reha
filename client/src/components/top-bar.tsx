import { useState, useEffect } from "react";
import { Moon, Sun, User, MessageCircle, X, Send, Users, ChevronLeft, Trash2, UserPlus, Lock, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { useAnnouncement } from "@/hooks/use-announcement";
import { RoleBadge } from "@/components/role-badge";
import { HamburgerMenuTrigger } from "@/components/hamburger-menu";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { UserRoleType } from "@shared/schema";
import type { ChatGroup, ChatMessage, User as UserType } from "@shared/schema";
import { useBackgroundMusic } from "@/components/background-music";

interface MessageWithUser extends ChatMessage {
  user?: UserType;
}

interface ChatGroupWithPrivate extends Omit<ChatGroup, 'isPrivate' | 'participants'> {
  isPrivate: boolean;
  participants: string[] | null;
}

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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ChatGroupWithPrivate | null>(null);
  const [message, setMessage] = useState("");
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const { hasAnnouncement } = useAnnouncement();
  const { youtubeId } = useBackgroundMusic();
  const { user, isAuthenticated, logout } = useAuth();
  const onlineCount = useFakeOnlineCount();

  const isAdminOrMod = user?.role === "ADMIN" || user?.role === "MOD";

  const { data: groups = [] } = useQuery<ChatGroupWithPrivate[]>({
    queryKey: ["/api/chat/groups"],
    enabled: isAuthenticated && isChatOpen,
    refetchInterval: 10000,
  });

  const { data: allUsers = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated && showUserPicker,
  });

  const { data: messages = [] } = useQuery<MessageWithUser[]>({
    queryKey: ["/api/chat/groups", selectedGroup?.id, "messages"],
    queryFn: async () => {
      if (!selectedGroup) return [];
      const res = await fetch(`/api/chat/groups/${selectedGroup.id}/messages`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedGroup && isChatOpen,
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedGroup) return;
      return apiRequest("POST", `/api/chat/groups/${selectedGroup.id}/messages`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/groups", selectedGroup?.id, "messages"] });
      setMessage("");
    },
  });

  const clearChatMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGroup) return;
      return apiRequest("DELETE", `/api/chat/groups/${selectedGroup.id}/messages`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/groups", selectedGroup?.id, "messages"] });
    },
  });

  const createPrivateChatMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await fetch("/api/chat/private", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Ozel sohbet olusturulamadi");
      return res.json();
    },
    onSuccess: (group: ChatGroupWithPrivate) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/groups"] });
      setShowUserPicker(false);
      setSelectedGroup(group);
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate(message);
  };

  const toggleMute = () => {
    const iframe = document.getElementById("youtube-music-player") as HTMLIFrameElement;
    if (iframe) {
      const message = isMuted 
        ? '{"event":"command","func":"unMute","args":""}' 
        : '{"event":"command","func":"mute","args":""}';
      iframe.contentWindow?.postMessage(message, '*');
    }
    setIsMuted(!isMuted);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("joy_theme");
    const prefersDark = savedTheme !== "light";
    setIsDark(prefersDark);
    
    if (prefersDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
  }, []);

  useEffect(() => {
    setTopOffset(hasAnnouncement ? 44 : 16);
  }, [hasAnnouncement]);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    
    if (newIsDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
    
    localStorage.setItem("joy_theme", newIsDark ? "dark" : "light");
  };

  if (!isAuthenticated) {
    return null;
  }

  const publicGroups = groups.filter(g => !g.isPrivate);
  const privateGroups = groups.filter(g => g.isPrivate);

  return (
    <>
      <div
        className="fixed left-2 sm:left-4 z-[60]"
        style={{ top: `${topOffset}px` }}
      >
        <HamburgerMenuTrigger />
      </div>
      <div
        className="fixed right-2 sm:right-4 z-[60] flex items-center gap-1 sm:gap-2"
        style={{ top: `${topOffset}px` }}
      >
        <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-background/95 border border-primary/30 text-xs" data-testid="online-count">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-primary font-medium">{onlineCount}</span>
          <span className="text-muted-foreground">online</span>
        </div>
        {youtubeId && (
          <Button
            variant="outline"
            size="icon"
            onClick={toggleMute}
            className="bg-background/95 border-primary/50 shadow-lg hover:bg-primary/20 w-8 h-8 sm:w-9 sm:h-9"
            data-testid="button-music-toggle"
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
          onClick={() => setIsChatOpen(true)}
          className="bg-background/95 border-primary/50 shadow-lg hover:bg-primary/20 w-8 h-8 sm:w-9 sm:h-9"
          data-testid="button-chat"
        >
          <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
        </Button>

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
                <Avatar className="w-10 h-10 border border-primary/30">
                  <AvatarImage src={user?.avatar || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {user?.displayName?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{user?.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">@{user?.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RoleBadge role={(user?.role as UserRoleType) || "USER"} />
                <span className="text-xs text-muted-foreground">Level {user?.level}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">
              <User className="w-4 h-4 mr-2" />
              Profil Ayarlari
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={logout}
            className="text-destructive focus:text-destructive cursor-pointer"
            data-testid="menu-item-logout"
          >
            Cikis Yap
          </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isChatOpen && (
        <Card className="fixed top-14 sm:top-16 right-2 sm:right-4 left-2 sm:left-auto z-[59] sm:w-72 h-[70vh] sm:h-80 max-h-[400px] shadow-2xl border-primary/30 flex flex-col">
          <CardHeader className="p-3 border-b flex flex-row items-center gap-2">
            {selectedGroup && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedGroup(null)}
                className="h-8 w-8"
                data-testid="button-back-groups"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
            <CardTitle className="text-sm flex-1 flex items-center gap-1">
              {selectedGroup ? (
                <>
                  {selectedGroup.isPrivate && <Lock className="w-3 h-3 text-primary" />}
                  {selectedGroup.name}
                </>
              ) : (
                "Canli Sohbet"
              )}
            </CardTitle>
            {!selectedGroup && isAdminOrMod && (
              <Dialog open={showUserPicker} onOpenChange={setShowUserPicker}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    data-testid="button-new-private-chat"
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="z-[100]">
                  <DialogHeader>
                    <DialogTitle>Ozel Sohbet Baslat</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-64 mt-4">
                    <div className="space-y-2">
                      {allUsers
                        .filter((u) => u.id !== user?.id)
                        .map((u) => (
                          <div
                            key={u.id}
                            onClick={() => createPrivateChatMutation.mutate(u.id)}
                            className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer"
                            data-testid={`user-select-${u.id}`}
                          >
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={u.avatar || undefined} />
                              <AvatarFallback className="bg-primary/20 text-primary">
                                {u.displayName?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{u.displayName}</p>
                              <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                            </div>
                            <RoleBadge role={(u.role as UserRoleType) || "USER"} />
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            )}
            {selectedGroup && isAdminOrMod && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    data-testid="button-clear-chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="z-[100]">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sohbeti Temizle</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tum mesajlar silinecek. Bu islem geri alinamaz.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Iptal</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => clearChatMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Temizle
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsChatOpen(false);
                setSelectedGroup(null);
              }}
              className="h-8 w-8"
              data-testid="button-close-chat"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
            {!selectedGroup ? (
              <ScrollArea className="flex-1 p-2">
                <div className="space-y-2">
                  {publicGroups.length === 0 && privateGroups.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Henuz grup yok
                    </p>
                  ) : (
                    <>
                      {publicGroups.map((group) => (
                        <div
                          key={group.id}
                          onClick={() => setSelectedGroup(group)}
                          className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer"
                          data-testid={`chat-group-${group.id}`}
                        >
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{group.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {group.description || "Sohbet grubu"}
                            </p>
                          </div>
                        </div>
                      ))}
                      {privateGroups.length > 0 && (
                        <>
                          <div className="text-xs text-muted-foreground font-medium mt-4 mb-2 px-1 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Ozel Sohbetler
                          </div>
                          {privateGroups.map((group) => (
                            <div
                              key={group.id}
                              onClick={() => setSelectedGroup(group)}
                              className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer"
                              data-testid={`chat-group-${group.id}`}
                            >
                              <div className="w-10 h-10 rounded-full bg-accent/50 flex items-center justify-center">
                                <Lock className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{group.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {group.description || "Ozel sohbet"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <>
                <ScrollArea className="flex-1 p-2">
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${msg.userId === user?.id ? "flex-row-reverse" : ""}`}
                      >
                        <Avatar className="w-6 h-6 flex-shrink-0">
                          <AvatarImage src={msg.user?.avatar || undefined} />
                          <AvatarFallback className="text-xs bg-primary/20 text-primary">
                            {msg.user?.displayName?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`max-w-[85%] ${msg.userId === user?.id ? "text-right" : ""}`}>
                          <p className={`text-[10px] mb-0.5 ${msg.userId === user?.id ? "mr-1" : "ml-1"}`}>
                            <span className={
                              msg.user?.role === "ADMIN" ? "chat-name-admin" :
                              msg.user?.role === "MOD" ? "chat-name-mod" :
                              msg.user?.role === "VIP" ? "chat-name-vip" :
                              "chat-name-user"
                            }>
                              {msg.user?.displayName || "Kullanici"}
                            </span>
                            {msg.user?.role === "VIP" && <span className="vip-badge">VIP</span>}
                          </p>
                          <div
                            className={`p-2 rounded-2xl text-sm shadow-sm relative ${
                              msg.userId === user?.id
                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                : "bg-muted text-foreground rounded-tl-none"
                            }`}
                          >
                            {msg.content}
                            <div className="flex justify-end mt-0.5 -mb-0.5 ml-2">
                               <span className="text-[9px] opacity-70">
                                 {msg.createdAt && new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                               </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="p-2 border-t flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Mesaj yaz..."
                    className="flex-1 h-8 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    data-testid="input-chat-message"
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!message.trim() || sendMutation.isPending}
                    className="h-8 w-8"
                    data-testid="button-send-message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}

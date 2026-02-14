import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAnnouncement } from "@/hooks/use-announcement";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, ChatGroup, ChatMessage, PrivateConversation, PrivateMessage } from "@shared/schema";
import { MessageCircle, Send, Users, Lock, Globe, Edit2, Trash2, Check, XCircle, Search } from "lucide-react";
import { Redirect } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MessageWithUser extends ChatMessage {
  user?: User;
}

interface PrivateMessageWithUser extends PrivateMessage {
  sender?: User;
}

interface ConversationWithUsers extends PrivateConversation {
  participant1?: User;
  participant2?: User;
  lastMessage?: PrivateMessageWithUser;
  unreadCount?: number;
}

export default function Messenger() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { hasAnnouncement } = useAnnouncement();
  const [selectedTab, setSelectedTab] = useState<"groups" | "private">("groups");
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithUsers | null>(null);
  const [message, setMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canModerate = user?.role === "ADMIN" || user?.role === "MOD";

  const { data: groups = [] } = useQuery<ChatGroup[]>({
    queryKey: ["/api/chat/groups"],
    enabled: isAuthenticated,
    refetchInterval: 10000,
  });

  const { data: groupMessages = [] } = useQuery<MessageWithUser[]>({
    queryKey: ["/api/chat/groups", selectedGroup?.id, "messages"],
    enabled: !!selectedGroup,
    refetchInterval: 3000,
  });

  const { data: conversations = [] } = useQuery<ConversationWithUsers[]>({
    queryKey: ["/api/private-conversations"],
    enabled: isAuthenticated && selectedTab === "private",
    refetchInterval: 5000,
  });

  const { data: privateMessages = [] } = useQuery<PrivateMessageWithUser[]>({
    queryKey: ["/api/private-conversations", selectedConversation?.id, "messages"],
    enabled: !!selectedConversation,
    refetchInterval: 3000,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated && searchUser.length > 0,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupMessages, privateMessages]);

  const sendGroupMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedGroup) return;
      return apiRequest("POST", `/api/chat/groups/${selectedGroup.id}/messages`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/groups", selectedGroup?.id, "messages"] });
      setMessage("");
    },
  });

  const sendPrivateMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedConversation) return;
      return apiRequest("POST", `/api/private-conversations/${selectedConversation.id}/messages`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/private-conversations", selectedConversation?.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/private-conversations"] });
      setMessage("");
    },
  });

  const createConversationMutation = useMutation({
    mutationFn: async (participantId: string) => {
      return apiRequest("POST", "/api/private-conversations", { participantId });
    },
    onSuccess: (data: ConversationWithUsers) => {
      queryClient.invalidateQueries({ queryKey: ["/api/private-conversations"] });
      setSelectedConversation(data);
      setSearchUser("");
    },
  });

  const updateMessageMutation = useMutation({
    mutationFn: async ({ id, content, isPrivate }: { id: string; content: string; isPrivate: boolean }) => {
      const endpoint = isPrivate ? `/api/private-messages/${id}` : `/api/chat/messages/${id}`;
      return apiRequest("PATCH", endpoint, { content });
    },
    onSuccess: () => {
      if (selectedGroup) {
        queryClient.invalidateQueries({ queryKey: ["/api/chat/groups", selectedGroup.id, "messages"] });
      }
      if (selectedConversation) {
        queryClient.invalidateQueries({ queryKey: ["/api/private-conversations", selectedConversation.id, "messages"] });
      }
      setEditingMessageId(null);
      setEditContent("");
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async ({ id, isPrivate }: { id: string; isPrivate: boolean }) => {
      const endpoint = isPrivate ? `/api/private-messages/${id}` : `/api/chat/messages/${id}`;
      return apiRequest("DELETE", endpoint);
    },
    onSuccess: () => {
      if (selectedGroup) {
        queryClient.invalidateQueries({ queryKey: ["/api/chat/groups", selectedGroup.id, "messages"] });
      }
      if (selectedConversation) {
        queryClient.invalidateQueries({ queryKey: ["/api/private-conversations", selectedConversation.id, "messages"] });
      }
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    if (selectedTab === "groups" && selectedGroup) {
      sendGroupMessageMutation.mutate(message);
    } else if (selectedTab === "private" && selectedConversation) {
      sendPrivateMessageMutation.mutate(message);
    }
  };

  const handleEdit = (msg: any, isPrivate: boolean) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
  };

  const handleSaveEdit = (isPrivate: boolean) => {
    if (!editingMessageId || !editContent.trim()) return;
    updateMessageMutation.mutate({ id: editingMessageId, content: editContent, isPrivate });
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleDelete = (id: string, isPrivate: boolean) => {
    if (confirm("Bu mesajı silmek istediğinize emin misiniz?")) {
      deleteMessageMutation.mutate({ id, isPrivate });
    }
  };

  const startConversation = (otherUser: User) => {
    createConversationMutation.mutate(otherUser.id);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  const renderMessages = (messages: any[], isPrivate: boolean) => {
    return messages.map((msg) => {
      const isOwn = isPrivate ? msg.senderId === user?.id : msg.userId === user?.id;
      const userName = isPrivate ? msg.sender?.displayName : msg.user?.displayName;
      
      return (
        <div
          key={msg.id}
          className={`flex gap-2 group mb-3 ${isOwn ? "flex-row-reverse" : ""}`}
        >
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarFallback className="bg-primary/20 text-primary font-semibold">
              {userName?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className={`max-w-[70%] ${isOwn ? "text-right" : ""}`}>
            {!isOwn && (
              <p className="text-xs font-semibold text-primary mb-1">{userName || "Kullanıcı"}</p>
            )}
            {editingMessageId === msg.id ? (
              <div className="flex gap-2 items-center">
                <Input
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="h-9"
                  onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(isPrivate)}
                  autoFocus
                />
                <Button size="icon" onClick={() => handleSaveEdit(isPrivate)} className="h-9 w-9">
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="icon" onClick={handleCancelEdit} variant="ghost" className="h-9 w-9">
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div
                  className={`px-4 py-2 rounded-2xl ${
                    isOwn
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted rounded-tl-sm"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <span className="text-[10px] opacity-70 mt-1 block">
                    {msg.createdAt && new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {isOwn && (
                  <div className="absolute -top-1 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 bg-white shadow-sm hover:bg-white/90"
                      onClick={() => handleEdit(msg, isPrivate)}
                    >
                      <Edit2 className="w-3 h-3 text-blue-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 bg-white shadow-sm hover:bg-white/90"
                      onClick={() => handleDelete(msg.id, isPrivate)}
                    >
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <div className={`min-h-screen bg-background ${hasAnnouncement ? "pt-20" : "pt-16"}`}>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <MessageCircle className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold text-gradient-gold">Messenger</h1>
        </div>

        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-200px)]">
          <Card className="col-span-4 flex flex-col">
            <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2 m-2">
                <TabsTrigger value="groups" className="gap-2">
                  <Globe className="w-4 h-4" />
                  Grup Sohbet
                </TabsTrigger>
                <TabsTrigger value="private" className="gap-2">
                  <Lock className="w-4 h-4" />
                  Özel Mesaj
                </TabsTrigger>
              </TabsList>

              <TabsContent value="groups" className="flex-1 overflow-hidden mt-0">
                <ScrollArea className="h-full p-2">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      onClick={() => {
                        setSelectedGroup(group);
                        setSelectedConversation(null);
                      }}
                      className={`p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                        selectedGroup?.id === group.id
                          ? "bg-primary/10 border border-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <Users className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{group.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {group.description || "Grup sohbeti"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="private" className="flex-1 overflow-hidden mt-0 flex flex-col">
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Kullanıcı ara..."
                      value={searchUser}
                      onChange={(e) => setSearchUser(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {searchUser && users.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                      {users.filter(u => u.id !== user?.id).map((u) => (
                        <div
                          key={u.id}
                          onClick={() => startConversation(u)}
                          className="p-2 hover:bg-muted rounded cursor-pointer flex items-center gap-2"
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>{u.displayName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{u.displayName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <ScrollArea className="flex-1 p-2">
                  {conversations.map((conv) => {
                    const otherUser = conv.participant1Id === user?.id ? conv.participant2 : conv.participant1;
                    return (
                      <div
                        key={conv.id}
                        onClick={() => {
                          setSelectedConversation(conv);
                          setSelectedGroup(null);
                        }}
                        className={`p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                          selectedConversation?.id === conv.id
                            ? "bg-primary/10 border border-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-12 h-12">
                            <AvatarFallback>{otherUser?.displayName?.charAt(0) || "U"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold truncate">{otherUser?.displayName || "Kullanıcı"}</p>
                              {conv.unreadCount && conv.unreadCount > 0 && (
                                <Badge variant="destructive" className="h-5 px-2 text-xs">
                                  {conv.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {conv.lastMessage?.content || "Henüz mesaj yok"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </Card>

          <Card className="col-span-8 flex flex-col">
            {!selectedGroup && !selectedConversation ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Bir sohbet seçin</p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 border-b">
                  <div className="flex items-center gap-3">
                    {selectedTab === "groups" ? (
                      <>
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <Users className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h2 className="font-semibold">{selectedGroup?.name}</h2>
                          <p className="text-xs text-muted-foreground">{selectedGroup?.description}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Avatar className="w-12 h-12">
                          <AvatarFallback>
                            {(selectedConversation?.participant1Id === user?.id
                              ? selectedConversation?.participant2?.displayName
                              : selectedConversation?.participant1?.displayName)?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h2 className="font-semibold">
                            {selectedConversation?.participant1Id === user?.id
                              ? selectedConversation?.participant2?.displayName
                              : selectedConversation?.participant1?.displayName}
                          </h2>
                          <p className="text-xs text-muted-foreground">Çevrimiçi</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <ScrollArea className="flex-1 p-4">
                  {selectedTab === "groups"
                    ? renderMessages(groupMessages, false)
                    : renderMessages(privateMessages, true)}
                  <div ref={messagesEndRef} />
                </ScrollArea>

                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Mesaj yaz..."
                      className="flex-1"
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      autoFocus
                    />
                    <Button onClick={handleSend} disabled={!message.trim()} size="icon" className="h-10 w-10">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}

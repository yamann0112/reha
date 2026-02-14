import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Users, ChevronLeft, Minus, Maximize2, Minimize2, Edit2, Trash2, Check, XCircle, Search, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ChatGroup, ChatMessage, User } from "@shared/schema";

interface MessageWithUser extends ChatMessage {
  user?: User;
}

export function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"groups" | "users">("groups");
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated } = useAuth();

  const { data: groups = [] } = useQuery<ChatGroup[]>({
    queryKey: ["/api/chat/groups"],
    enabled: isAuthenticated && isOpen,
    refetchInterval: 10000,
  });

  const { data: messages = [] } = useQuery<MessageWithUser[]>({
    queryKey: ["/api/chat/groups", selectedGroup?.id, "messages"],
    queryFn: async () => {
      if (!selectedGroup) return [];
      const res = await fetch(`/api/chat/groups/${selectedGroup.id}/messages`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedGroup && isOpen && selectedTab === "groups",
    refetchInterval: 3000,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated && isOpen && selectedTab === "users",
  });

  useEffect(() => {
    if (messagesEndRef.current && !isMinimized) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isMinimized]);

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

  const updateMessageMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      return apiRequest("PATCH", `/api/chat/messages/${id}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/groups", selectedGroup?.id, "messages"] });
      setEditingMessageId(null);
      setEditContent("");
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/chat/messages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/groups", selectedGroup?.id, "messages"] });
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate(message);
  };

  const handleEdit = (msg: MessageWithUser) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
  };

  const handleSaveEdit = () => {
    if (!editingMessageId || !editContent.trim()) return;
    updateMessageMutation.mutate({ id: editingMessageId, content: editContent });
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleDelete = (id: string) => {
    if (confirm("Bu mesajı silmek istediğinize emin misiniz?")) {
      deleteMessageMutation.mutate(id);
    }
  };

  if (!isAuthenticated) return null;

  const chatSize = isMaximized 
    ? "w-[95vw] h-[95vh]" 
    : "w-[420px] h-[600px]";

  const filteredUsers = users.filter(u => 
    u.id !== user?.id && 
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-2xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-4 border-white transition-all hover:scale-110"
          data-testid="button-floating-chat"
        >
          <MessageCircle className="w-8 h-8" />
        </Button>
      )}

      {isOpen && (
        <Card className={`fixed bottom-6 right-6 z-50 ${chatSize} shadow-2xl border-2 border-primary/20 flex flex-col transition-all duration-300 ${isMinimized ? 'h-16' : ''} rounded-2xl overflow-hidden`}>
          <CardHeader className="p-3 border-b bg-gradient-to-r from-blue-500 to-blue-600 text-white flex flex-row items-center gap-2">
            {selectedGroup && !isMinimized && selectedTab === "groups" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedGroup(null)}
                className="h-8 w-8 text-white hover:bg-white/20"
                data-testid="button-back-groups"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
            <CardTitle className="text-sm flex-1 flex items-center gap-2 font-semibold">
              <MessageCircle className="w-5 h-5" />
              {selectedGroup ? selectedGroup.name : "Messenger"}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 text-white hover:bg-white/20"
                data-testid="button-minimize-chat"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMaximized(!isMaximized)}
                className="h-8 w-8 text-white hover:bg-white/20"
                data-testid="button-maximize-chat"
              >
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsOpen(false);
                  setSelectedGroup(null);
                  setIsMinimized(false);
                  setIsMaximized(false);
                }}
                className="h-8 w-8 text-white hover:bg-white/20"
                data-testid="button-close-chat"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          {!isMinimized && (
            <CardContent className="flex-1 p-0 overflow-hidden flex flex-col bg-gray-50">
              {!selectedGroup ? (
                <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)} className="flex-1 flex flex-col">
                  <TabsList className="m-2 grid w-[calc(100%-16px)] grid-cols-2">
                    <TabsTrigger value="groups" className="gap-2">
                      <Globe className="w-4 h-4" />
                      Grup Sohbet
                    </TabsTrigger>
                    <TabsTrigger value="users" className="gap-2">
                      <Users className="w-4 h-4" />
                      Kişiler
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="groups" className="flex-1 overflow-hidden mt-0">
                    <ScrollArea className="h-full p-2">
                      <div className="space-y-2">
                        {groups.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            Henüz grup yok
                          </p>
                        ) : (
                          groups.map((group) => (
                            <div
                              key={group.id}
                              onClick={() => {
                                setSelectedGroup(group);
                                setSelectedTab("groups");
                              }}
                              className="flex items-center gap-3 p-3 rounded-xl hover:bg-white cursor-pointer transition-all shadow-sm hover:shadow-md bg-white"
                              data-testid={`chat-group-${group.id}`}
                            >
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow">
                                <Users className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 truncate">{group.name}</p>
                                <p className="text-xs text-gray-500 truncate">
                                  {group.description || "Grup sohbeti"}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="users" className="flex-1 overflow-hidden mt-0 flex flex-col">
                    <div className="p-2 border-b bg-white">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Kişi ara..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 rounded-full border-gray-300"
                        />
                      </div>
                    </div>
                    <ScrollArea className="flex-1 p-2">
                      <div className="space-y-1">
                        {filteredUsers.map((u) => (
                          <div
                            key={u.id}
                            onClick={() => setSelectedUser(u)}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white cursor-pointer transition-all shadow-sm hover:shadow-md bg-white"
                          >
                            <Avatar className="w-12 h-12 border-2 border-blue-200">
                              <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold">
                                {u.displayName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{u.displayName}</p>
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-xs text-gray-500">Çevrimiçi</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              ) : (
                <>
                  <ScrollArea className="flex-1 p-4 bg-white">
                    <div className="space-y-3">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-2 group ${msg.userId === user?.id ? "flex-row-reverse" : ""}`}
                        >
                          <Avatar className="w-9 h-9 flex-shrink-0 border-2 border-gray-200">
                            <AvatarFallback className="text-xs bg-gradient-to-br from-blue-400 to-blue-600 text-white font-semibold">
                              {msg.user?.displayName?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`max-w-[75%] ${msg.userId === user?.id ? "text-right" : ""}`}>
                            {msg.userId !== user?.id && (
                              <p className="text-[10px] font-bold text-blue-600 mb-0.5 ml-1">
                                {msg.user?.displayName || "Kullanıcı"}
                              </p>
                            )}
                            {editingMessageId === msg.id ? (
                              <div className="flex gap-2 items-center">
                                <Input
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="h-9 text-sm rounded-full"
                                  onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                                  autoFocus
                                />
                                <Button size="icon" onClick={handleSaveEdit} className="h-8 w-8 rounded-full bg-green-500 hover:bg-green-600">
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button size="icon" onClick={handleCancelEdit} variant="ghost" className="h-8 w-8 rounded-full">
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="relative group">
                                <div
                                  className={`px-4 py-2 rounded-3xl text-sm shadow-md ${
                                    msg.userId === user?.id
                                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-sm"
                                      : "bg-gray-200 text-gray-900 rounded-bl-sm"
                                  }`}
                                >
                                  {msg.content}
                                  <div className="flex justify-end mt-1">
                                    <span className="text-[9px] opacity-70">
                                      {msg.createdAt && new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>
                                {msg.userId === user?.id && (
                                  <div className="absolute -top-1 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 bg-white shadow-md hover:bg-gray-100 rounded-full"
                                      onClick={() => handleEdit(msg)}
                                    >
                                      <Edit2 className="w-3 h-3 text-blue-600" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 bg-white shadow-md hover:bg-gray-100 rounded-full"
                                      onClick={() => handleDelete(msg.id)}
                                    >
                                      <Trash2 className="w-3 h-3 text-red-600" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                  <div className="p-3 border-t bg-white">
                    <div className="flex gap-2">
                      <Input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Aa"
                        className="flex-1 h-10 text-sm rounded-full border-gray-300 focus:border-blue-500"
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        data-testid="input-chat-message"
                      />
                      <Button
                        size="icon"
                        onClick={handleSend}
                        disabled={!message.trim() || sendMutation.isPending}
                        className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                        data-testid="button-send-message"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </>
  );
}

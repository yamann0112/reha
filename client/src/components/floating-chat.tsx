import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Minus, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ChatMessage, User } from "@shared/schema";

interface MessageWithUser extends ChatMessage {
  user?: User;
}

export function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated } = useAuth();

  // Get general chat group (first group or create one)
  const { data: groups = [] } = useQuery<any[]>({
    queryKey: ["/api/chat/groups"],
    enabled: isAuthenticated && isOpen,
    refetchInterval: 10000,
  });

  const generalGroup = groups.find(g => g.name === "Genel Sohbet") || groups[0];

  const { data: messages = [] } = useQuery<MessageWithUser[]>({
    queryKey: ["/api/chat/groups", generalGroup?.id, "messages"],
    queryFn: async () => {
      if (!generalGroup) return [];
      const res = await fetch(`/api/chat/groups/${generalGroup.id}/messages`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!generalGroup && isOpen,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (messagesEndRef.current && !isMinimized) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isMinimized]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!generalGroup) return;
      return apiRequest("POST", `/api/chat/groups/${generalGroup.id}/messages`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/groups", generalGroup?.id, "messages"] });
      setMessage("");
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate(message);
  };

  if (!isAuthenticated) return null;

  const chatSize = isMaximized 
    ? "w-[95vw] h-[95vh]" 
    : "w-[420px] h-[600px]";

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
            <CardTitle className="text-sm flex-1 flex items-center gap-2 font-semibold">
              <MessageCircle className="w-5 h-5" />
              Genel Sohbet
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
            </CardContent>
          )}
        </Card>
      )}
    </>
  );
}

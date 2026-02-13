import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAnnouncement } from "@/hooks/use-announcement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTicketSchema, type InsertTicket, type Ticket } from "@shared/schema";
import { Ticket as TicketIcon, Plus, Clock, CheckCircle, XCircle, Loader2, Trash2 } from "lucide-react";
import { Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale";


const getStatusBadge = (status: string) => {
  switch (status) {
    case "open":
      return <Badge className="bg-blue-500">Açık</Badge>;
    case "in_progress":
      return <Badge className="bg-amber-500">İşlemde</Badge>;
    case "resolved":
      return <Badge className="bg-green-500">Çözüldü</Badge>;
    case "closed":
      return <Badge variant="secondary">Kapalı</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "open":
      return <Clock className="w-4 h-4 text-blue-500" />;
    case "in_progress":
      return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
    case "resolved":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "closed":
      return <XCircle className="w-4 h-4 text-muted-foreground" />;
    default:
      return null;
  }
};

export default function Tickets() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { hasAnnouncement } = useAnnouncement();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const canModerateTickets = user?.role === "ADMIN" || user?.role === "MOD";

  const form = useForm<InsertTicket>({
    resolver: zodResolver(insertTicketSchema),
    defaultValues: {
      subject: "",
      message: "",
    },
  });

  const { data: tickets, isLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
    enabled: isAuthenticated,
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: InsertTicket) => {
      return apiRequest("POST", "/api/tickets", data);
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Destek talebiniz oluşturuldu.",
      });
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Talep oluşturulamadı.",
        variant: "destructive",
      });
    },
  });

  const updateTicketStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/tickets/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Başarılı", description: "Ticket durumu güncellendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const deleteTicketMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/tickets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Başarılı", description: "Ticket silindi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

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

  const onSubmit = (data: InsertTicket) => {
    createTicketMutation.mutate(data);
  };

  return (
    <div className={`min-h-screen bg-background ${hasAnnouncement ? "pt-20" : "pt-16"}`}>
      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-6">
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gradient-gold">Destek</h1>
            <p className="text-sm text-muted-foreground">Destek taleplerinizi yönetin</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-create-ticket">
                <Plus className="w-4 h-4" />
                Yeni Talep
              </Button>
            </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yeni Destek Talebi</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Konu</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Talep konusu"
                              data-testid="input-ticket-subject"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mesaj</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Sorununuzu detaylı açıklayın..."
                              rows={4}
                              data-testid="input-ticket-message"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={createTicketMutation.isPending}
                      data-testid="button-submit-ticket"
                    >
                      {createTicketMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Gönderiliyor...
                        </>
                      ) : (
                        "Gönder"
                      )}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-muted rounded animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-1/3 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-1/4 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : tickets && tickets.length > 0 ? (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Card
                key={ticket.id}
                className="hover-elevate transition-all"
                data-testid={`ticket-${ticket.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {getStatusIcon(ticket.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4 mb-1 flex-wrap">
                        <h3 className="font-semibold truncate">{ticket.subject}</h3>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {ticket.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.createdAt &&
                          format(new Date(ticket.createdAt), "d MMMM yyyy, HH:mm", {
                            locale: tr,
                          })}
                      </p>
                    </div>
                    {canModerateTickets && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Select
                          value={ticket.status}
                          onValueChange={(status) => updateTicketStatusMutation.mutate({ id: ticket.id, status })}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs" data-testid={`select-status-${ticket.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Açık</SelectItem>
                            <SelectItem value="in_progress">İşlemde</SelectItem>
                            <SelectItem value="resolved">Çözüldü</SelectItem>
                            <SelectItem value="closed">Kapalı</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Bu ticket'i silmek istediğinize emin misiniz?")) {
                              deleteTicketMutation.mutate(ticket.id);
                            }
                          }}
                          data-testid={`button-delete-ticket-${ticket.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <TicketIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Henüz Talep Yok</h3>
            <p className="text-muted-foreground mb-4">
              Bir sorun yaşıyorsanız destek talebi oluşturabilirsiniz.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-ticket">
              <Plus className="w-4 h-4 mr-2" />
              İlk Talebi Oluştur
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}

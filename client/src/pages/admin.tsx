import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { StatCard, StatCardSkeleton } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "@/components/role-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, Announcement, UserRoleType, Banner, BannerAnimationTypeValue, EmbeddedSite } from "@shared/schema";
import { Shield, Users, Calendar, Ticket as TicketIcon, MessageSquare, Crown, Activity, Plus, Trash2, Edit, Megaphone, Save, Image, Eye, EyeOff, ArrowUp, ArrowDown, Gamepad2, ExternalLink } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Redirect } from "wouter";
import { useAnnouncement } from "@/hooks/use-announcement";


export default function Admin() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { hasAnnouncement } = useAnnouncement();
  const { toast } = useToast();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [isAddBannerOpen, setIsAddBannerOpen] = useState(false);
  const [isEditBannerOpen, setIsEditBannerOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);
  const [newBanner, setNewBanner] = useState({
    title: "",
    description: "",
    imageUrl: "",
    ctaLabel: "",
    ctaUrl: "",
    animationType: "fade" as BannerAnimationTypeValue,
    isActive: true,
  });
  const [editBannerData, setEditBannerData] = useState({
    title: "",
    description: "",
    imageUrl: "",
    ctaLabel: "",
    ctaUrl: "",
    animationType: "fade" as BannerAnimationTypeValue,
    isActive: true,
  });

  const [isAddSiteOpen, setIsAddSiteOpen] = useState(false);
  const [isEditSiteOpen, setIsEditSiteOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<EmbeddedSite | null>(null);
  const [newSite, setNewSite] = useState({
    name: "",
    description: "",
    category: "",
    url: "",
    imageUrl: "",
    isActive: true,
    displayOrder: 0,
  });
  const [editSiteData, setEditSiteData] = useState({
    name: "",
    description: "",
    category: "",
    url: "",
    imageUrl: "",
    isActive: true,
    displayOrder: 0,
  });

  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    displayName: "",
    role: "USER" as UserRoleType,
    level: 1,
  });

  const [editUserData, setEditUserData] = useState({
    displayName: "",
    role: "USER" as UserRoleType,
    level: 1,
  });

  const { data: stats } = useQuery<{
    totalUsers: number;
    totalEvents: number;
    totalMessages: number;
    totalTickets: number;
  }>({
    queryKey: ["/api/stats"],
    enabled: isAuthenticated,
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  const { data: announcements } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  const { data: banners } = useQuery<Banner[]>({
    queryKey: ["/api/admin/banners"],
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  const { data: embeddedSites } = useQuery<EmbeddedSite[]>({
    queryKey: ["/api/admin/embedded-sites"],
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof newUser) => {
      const response = await apiRequest("POST", "/api/admin/users", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setIsAddUserOpen(false);
      setNewUser({ username: "", password: "", displayName: "", role: "USER", level: 1 });
      toast({ title: "Basarili", description: "Kullanici olusturuldu" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof editUserData }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsEditUserOpen(false);
      setSelectedUser(null);
      toast({ title: "Basarili", description: "Kullanici guncellendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/users/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Basarili", description: "Kullanici silindi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/admin/announcements", { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/active"] });
      setNewAnnouncement("");
      toast({ title: "Basarili", description: "Duyuru yayinlandi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/announcements/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/active"] });
      toast({ title: "Basarili", description: "Duyuru silindi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const createBannerMutation = useMutation({
    mutationFn: async (data: typeof newBanner) => {
      const response = await apiRequest("POST", "/api/admin/banners", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
      setIsAddBannerOpen(false);
      setNewBanner({ title: "", description: "", imageUrl: "", ctaLabel: "", ctaUrl: "", animationType: "fade", isActive: true });
      toast({ title: "Basarili", description: "Banner olusturuldu" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const updateBannerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Banner> }) => {
      const response = await apiRequest("PATCH", `/api/admin/banners/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
      setIsEditBannerOpen(false);
      setSelectedBanner(null);
      toast({ title: "Basarili", description: "Banner guncellendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const deleteBannerMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/banners/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
      toast({ title: "Basarili", description: "Banner silindi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const createSiteMutation = useMutation({
    mutationFn: async (data: typeof newSite) => {
      const response = await apiRequest("POST", "/api/admin/embedded-sites", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/embedded-sites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/embedded-sites"] });
      setIsAddSiteOpen(false);
      setNewSite({ name: "", description: "", category: "", url: "", imageUrl: "", isActive: true, displayOrder: 0 });
      toast({ title: "Basarili", description: "Site eklendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const updateSiteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EmbeddedSite> }) => {
      const response = await apiRequest("PATCH", `/api/admin/embedded-sites/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/embedded-sites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/embedded-sites"] });
      setIsEditSiteOpen(false);
      setSelectedSite(null);
      toast({ title: "Basarili", description: "Site guncellendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const deleteSiteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/embedded-sites/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/embedded-sites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/embedded-sites"] });
      toast({ title: "Basarili", description: "Site silindi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const handleEditSite = (s: EmbeddedSite) => {
    setSelectedSite(s);
    setEditSiteData({
      name: s.name,
      description: s.description || "",
      category: s.category,
      url: s.url,
      imageUrl: s.imageUrl || "",
      isActive: s.isActive,
      displayOrder: s.displayOrder,
    });
    setIsEditSiteOpen(true);
  };

  const handleEditBanner = (b: Banner) => {
    setSelectedBanner(b);
    setEditBannerData({
      title: b.title || "",
      description: b.description || "",
      imageUrl: b.imageUrl || "",
      ctaLabel: b.ctaLabel || "",
      ctaUrl: b.ctaUrl || "",
      animationType: (b.animationType as BannerAnimationTypeValue) || "fade",
      isActive: b.isActive,
    });
    setIsEditBannerOpen(true);
  };

  const handleEditUser = (u: User) => {
    setSelectedUser(u);
    setEditUserData({
      displayName: u.displayName,
      role: (u.role as UserRoleType) || "USER",
      level: u.level,
    });
    setIsEditUserOpen(true);
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

  if (user?.role !== "ADMIN") {
    return <Redirect to="/dashboard" />;
  }

  return (
    <div className={`min-h-screen bg-background ${hasAnnouncement ? "pt-20" : "pt-16"}`}>
      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-8">
        
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Platform Istatistikleri
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats ? (
              <>
                <StatCard title="Toplam Uye" value={stats.totalUsers} icon={Users} />
                <StatCard title="Etkinlikler" value={stats.totalEvents} icon={Calendar} />
                <StatCard title="Mesajlar" value={stats.totalMessages} icon={MessageSquare} />
                <StatCard title="Destek Talepleri" value={stats.totalTickets} icon={TicketIcon} />
              </>
            ) : (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            )}
          </div>
        </section>

        <Tabs defaultValue="users">
          <TabsList className="flex-wrap">
            <TabsTrigger value="users" data-testid="tab-admin-users">
              <Users className="w-4 h-4 mr-2" />
              Kullanicilar
            </TabsTrigger>
            <TabsTrigger value="announcements" data-testid="tab-admin-announcements">
              <Megaphone className="w-4 h-4 mr-2" />
              Duyurular
            </TabsTrigger>
            <TabsTrigger value="banners" data-testid="tab-admin-banners">
              <Image className="w-4 h-4 mr-2" />
              Bannerlar
            </TabsTrigger>
            <TabsTrigger value="embedded-sites" data-testid="tab-admin-embedded-sites">
              <Gamepad2 className="w-4 h-4 mr-2" />
              Gömmeli Siteler
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                <CardTitle>Kullanici Yonetimi</CardTitle>
                <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-user">
                      <Plus className="w-4 h-4 mr-2" />
                      Kullanici Ekle
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Yeni Kullanici Olustur</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Kullanici Adi</Label>
                        <Input
                          data-testid="input-new-username"
                          value={newUser.username}
                          onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                          placeholder="kullaniciadi"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Sifre</Label>
                        <Input
                          data-testid="input-new-password"
                          type="password"
                          value={newUser.password}
                          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                          placeholder="******"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Gorunen Isim</Label>
                        <Input
                          data-testid="input-new-displayname"
                          value={newUser.displayName}
                          onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                          placeholder="Gorunen isim"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Rol</Label>
                        <Select
                          value={newUser.role}
                          onValueChange={(v) => setNewUser({ ...newUser, role: v as UserRoleType })}
                        >
                          <SelectTrigger data-testid="select-new-role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USER">USER</SelectItem>
                            <SelectItem value="VIP">VIP</SelectItem>
                            <SelectItem value="MOD">MOD</SelectItem>
                            <SelectItem value="ADMIN">ADMIN</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Level (1-100)</Label>
                        <Input
                          data-testid="input-new-level"
                          type="number"
                          min={1}
                          max={100}
                          value={newUser.level}
                          onChange={(e) => setNewUser({ ...newUser, level: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <Button
                        className="w-full"
                        data-testid="button-submit-new-user"
                        onClick={() => createUserMutation.mutate(newUser)}
                        disabled={createUserMutation.isPending}
                      >
                        {createUserMutation.isPending ? "Olusturuluyor..." : "Kullanici Olustur"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                        <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-1/4 bg-muted rounded animate-pulse" />
                          <div className="h-3 w-1/6 bg-muted rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : users && users.length > 0 ? (
                  <div className="space-y-2">
                    {users.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center gap-4 p-3 rounded-lg bg-card border border-card-border hover-elevate"
                        data-testid={`user-row-${u.id}`}
                      >
                        <Avatar className="w-10 h-10 border border-primary/30">
                          <AvatarImage src={u.avatar || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {u.displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">{u.displayName}</span>
                            <RoleBadge role={(u.role as UserRoleType) || "USER"} size="sm" />
                            {u.isOnline && (
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">@{u.username}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">Level {u.level}</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditUser(u)}
                            data-testid={`button-edit-user-${u.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm("Bu kullaniciyi silmek istediginize emin misiniz?")) {
                                deleteUserMutation.mutate(u.id);
                              }
                            }}
                            disabled={u.id === user?.id}
                            data-testid={`button-delete-user-${u.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Henuz kullanici yok</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Kullanici Duzenle: {selectedUser?.displayName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Gorunen Isim</Label>
                    <Input
                      data-testid="input-edit-displayname"
                      value={editUserData.displayName}
                      onChange={(e) => setEditUserData({ ...editUserData, displayName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rol</Label>
                    <Select
                      value={editUserData.role}
                      onValueChange={(v) => setEditUserData({ ...editUserData, role: v as UserRoleType })}
                    >
                      <SelectTrigger data-testid="select-edit-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USER">USER</SelectItem>
                        <SelectItem value="VIP">VIP</SelectItem>
                        <SelectItem value="MOD">MOD</SelectItem>
                        <SelectItem value="ADMIN">ADMIN</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Level (1-100)</Label>
                    <Input
                      data-testid="input-edit-level"
                      type="number"
                      min={1}
                      max={100}
                      value={editUserData.level}
                      onChange={(e) => setEditUserData({ ...editUserData, level: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <Button
                    className="w-full"
                    data-testid="button-submit-edit-user"
                    onClick={() => {
                      if (selectedUser) {
                        updateUserMutation.mutate({ id: selectedUser.id, data: editUserData });
                      }
                    }}
                    disabled={updateUserMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateUserMutation.isPending ? "Kaydediliyor..." : "Degisiklikleri Kaydet"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="announcements" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-primary" />
                  Duyuru Yonetimi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Yeni Duyuru Yayinla</Label>
                  <Textarea
                    data-testid="input-new-announcement"
                    value={newAnnouncement}
                    onChange={(e) => setNewAnnouncement(e.target.value)}
                    placeholder="Duyuru metni yazin... (Bu duyuru anasayfada kayan yazi olarak gorunecek)"
                    rows={3}
                  />
                  <Button
                    data-testid="button-publish-announcement"
                    onClick={() => {
                      if (newAnnouncement.trim()) {
                        createAnnouncementMutation.mutate(newAnnouncement);
                      }
                    }}
                    disabled={createAnnouncementMutation.isPending || !newAnnouncement.trim()}
                  >
                    <Megaphone className="w-4 h-4 mr-2" />
                    {createAnnouncementMutation.isPending ? "Yayinlaniyor..." : "Duyuruyu Yayinla"}
                  </Button>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium mb-4">Mevcut Duyurular</h4>
                  {announcements && announcements.length > 0 ? (
                    <div className="space-y-3">
                      {announcements.map((a) => (
                        <div
                          key={a.id}
                          className={`p-4 rounded-lg border ${a.isActive ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                          data-testid={`announcement-${a.id}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {a.isActive && (
                                  <Badge className="bg-primary text-primary-foreground">Aktif</Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {new Date(a.createdAt!).toLocaleDateString("tr-TR")}
                                </span>
                              </div>
                              <p className="text-sm">{a.content}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteAnnouncementMutation.mutate(a.id)}
                              data-testid={`button-delete-announcement-${a.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Henuz duyuru yok</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="banners" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5 text-primary" />
                  Banner Yonetimi
                </CardTitle>
                <Dialog open={isAddBannerOpen} onOpenChange={setIsAddBannerOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-banner">
                      <Plus className="w-4 h-4 mr-2" />
                      Banner Ekle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Yeni Banner Olustur</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto">
                      <div className="space-y-2">
                        <Label>Baslik (opsiyonel)</Label>
                        <Input
                          data-testid="input-new-banner-title"
                          value={newBanner.title}
                          onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
                          placeholder="Banner basligi"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Aciklama</Label>
                        <Textarea
                          data-testid="input-new-banner-description"
                          value={newBanner.description}
                          onChange={(e) => setNewBanner({ ...newBanner, description: e.target.value })}
                          placeholder="Banner aciklamasi (opsiyonel)"
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Gorsel URL</Label>
                        <p className="text-xs text-muted-foreground">Onerilen boyut: 740x106 piksel</p>
                        <Input
                          data-testid="input-new-banner-image"
                          value={newBanner.imageUrl}
                          onChange={(e) => setNewBanner({ ...newBanner, imageUrl: e.target.value })}
                          placeholder="https://example.com/image.jpg (opsiyonel)"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Buton Metni</Label>
                          <Input
                            data-testid="input-new-banner-cta-label"
                            value={newBanner.ctaLabel}
                            onChange={(e) => setNewBanner({ ...newBanner, ctaLabel: e.target.value })}
                            placeholder="Ornegin: Daha Fazla"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Buton Linki</Label>
                          <Input
                            data-testid="input-new-banner-cta-url"
                            value={newBanner.ctaUrl}
                            onChange={(e) => setNewBanner({ ...newBanner, ctaUrl: e.target.value })}
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Animasyon Tipi</Label>
                        <Select
                          value={newBanner.animationType}
                          onValueChange={(v) => setNewBanner({ ...newBanner, animationType: v as BannerAnimationTypeValue })}
                        >
                          <SelectTrigger data-testid="select-new-banner-animation">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Animasyon Yok</SelectItem>
                            <SelectItem value="fade">Fade (Solma)</SelectItem>
                            <SelectItem value="slide">Slide (Kayma)</SelectItem>
                            <SelectItem value="zoom">Zoom (Buyume)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Aktif</Label>
                        <Switch
                          checked={newBanner.isActive}
                          onCheckedChange={(checked) => setNewBanner({ ...newBanner, isActive: checked })}
                          data-testid="switch-new-banner-active"
                        />
                      </div>
                      <Button
                        className="w-full"
                        data-testid="button-submit-new-banner"
                        onClick={() => createBannerMutation.mutate(newBanner)}
                        disabled={createBannerMutation.isPending}
                      >
                        {createBannerMutation.isPending ? "Olusturuluyor..." : "Banner Olustur"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {banners && banners.length > 0 ? (
                  <div className="space-y-3">
                    {banners.map((b) => (
                      <div
                        key={b.id}
                        className={`p-4 rounded-lg border ${b.isActive ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                        data-testid={`banner-${b.id}`}
                      >
                        <div className="flex items-start gap-4">
                          {b.imageUrl && (
                            <div
                              className="w-24 h-16 rounded bg-cover bg-center border border-border flex-shrink-0"
                              style={{ backgroundImage: `url(${b.imageUrl})` }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-medium truncate">{b.title || "(Baslıksiz)"}</span>
                              {b.isActive ? (
                                <Badge className="bg-primary text-primary-foreground">Aktif</Badge>
                              ) : (
                                <Badge variant="outline">Pasif</Badge>
                              )}
                              <Badge variant="outline" className="capitalize">{b.animationType}</Badge>
                            </div>
                            {b.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">{b.description}</p>
                            )}
                            {b.ctaLabel && (
                              <p className="text-xs text-primary mt-1">Buton: {b.ctaLabel}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => updateBannerMutation.mutate({ id: b.id, data: { isActive: !b.isActive } })}
                              data-testid={`button-toggle-banner-${b.id}`}
                            >
                              {b.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditBanner(b)}
                              data-testid={`button-edit-banner-${b.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm("Bu banneri silmek istediginize emin misiniz?")) {
                                  deleteBannerMutation.mutate(b.id);
                                }
                              }}
                              data-testid={`button-delete-banner-${b.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Henuz banner yok</p>
                    <p className="text-sm mt-2">Anasayfada gorunecek bannerlar ekleyebilirsiniz</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Dialog open={isEditBannerOpen} onOpenChange={setIsEditBannerOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Banner Duzenle</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-2">
                    <Label>Baslik (opsiyonel)</Label>
                    <Input
                      data-testid="input-edit-banner-title"
                      value={editBannerData.title}
                      onChange={(e) => setEditBannerData({ ...editBannerData, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Aciklama</Label>
                    <Textarea
                      data-testid="input-edit-banner-description"
                      value={editBannerData.description}
                      onChange={(e) => setEditBannerData({ ...editBannerData, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gorsel URL</Label>
                    <p className="text-xs text-muted-foreground">Onerilen boyut: 740x106 piksel</p>
                    <Input
                      data-testid="input-edit-banner-image"
                      value={editBannerData.imageUrl}
                      onChange={(e) => setEditBannerData({ ...editBannerData, imageUrl: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Buton Metni</Label>
                      <Input
                        data-testid="input-edit-banner-cta-label"
                        value={editBannerData.ctaLabel}
                        onChange={(e) => setEditBannerData({ ...editBannerData, ctaLabel: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Buton Linki</Label>
                      <Input
                        data-testid="input-edit-banner-cta-url"
                        value={editBannerData.ctaUrl}
                        onChange={(e) => setEditBannerData({ ...editBannerData, ctaUrl: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Animasyon Tipi</Label>
                    <Select
                      value={editBannerData.animationType}
                      onValueChange={(v) => setEditBannerData({ ...editBannerData, animationType: v as BannerAnimationTypeValue })}
                    >
                      <SelectTrigger data-testid="select-edit-banner-animation">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Animasyon Yok</SelectItem>
                        <SelectItem value="fade">Fade (Solma)</SelectItem>
                        <SelectItem value="slide">Slide (Kayma)</SelectItem>
                        <SelectItem value="zoom">Zoom (Buyume)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Aktif</Label>
                    <Switch
                      checked={editBannerData.isActive}
                      onCheckedChange={(checked) => setEditBannerData({ ...editBannerData, isActive: checked })}
                      data-testid="switch-edit-banner-active"
                    />
                  </div>
                  <Button
                    className="w-full"
                    data-testid="button-submit-edit-banner"
                    onClick={() => {
                      if (selectedBanner) {
                        updateBannerMutation.mutate({ id: selectedBanner.id, data: editBannerData });
                      }
                    }}
                    disabled={updateBannerMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateBannerMutation.isPending ? "Kaydediliyor..." : "Degisiklikleri Kaydet"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="embedded-sites" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                <CardTitle className="flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-primary" />
                  Gömmeli Site Yönetimi
                </CardTitle>
                <Dialog open={isAddSiteOpen} onOpenChange={setIsAddSiteOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-site">
                      <Plus className="w-4 h-4 mr-2" />
                      Site Ekle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Yeni Gömmeli Site Ekle</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto">
                      <div className="space-y-2">
                        <Label>İsim *</Label>
                        <Input
                          data-testid="input-new-site-name"
                          value={newSite.name}
                          onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                          placeholder="Oyun veya içerik ismi"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Açıklama</Label>
                        <Textarea
                          data-testid="input-new-site-description"
                          value={newSite.description}
                          onChange={(e) => setNewSite({ ...newSite, description: e.target.value })}
                          placeholder="Kısa açıklama (opsiyonel)"
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Kategori *</Label>
                        <Input
                          data-testid="input-new-site-category"
                          value={newSite.category}
                          onChange={(e) => setNewSite({ ...newSite, category: e.target.value })}
                          placeholder="Oyunlar, Filmler, Analiz, vb."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>URL (Gömmeli Link) *</Label>
                        <Input
                          data-testid="input-new-site-url"
                          value={newSite.url}
                          onChange={(e) => setNewSite({ ...newSite, url: e.target.value })}
                          placeholder="https://example.com/game"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Görsel URL</Label>
                        <Input
                          data-testid="input-new-site-image"
                          value={newSite.imageUrl}
                          onChange={(e) => setNewSite({ ...newSite, imageUrl: e.target.value })}
                          placeholder="https://example.com/image.jpg (opsiyonel)"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Sıralama</Label>
                        <Input
                          data-testid="input-new-site-order"
                          type="number"
                          value={newSite.displayOrder}
                          onChange={(e) => setNewSite({ ...newSite, displayOrder: parseInt(e.target.value) || 0 })}
                          placeholder="0"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Aktif</Label>
                        <Switch
                          checked={newSite.isActive}
                          onCheckedChange={(checked) => setNewSite({ ...newSite, isActive: checked })}
                          data-testid="switch-new-site-active"
                        />
                      </div>
                      <Button
                        className="w-full"
                        data-testid="button-submit-new-site"
                        onClick={() => createSiteMutation.mutate(newSite)}
                        disabled={createSiteMutation.isPending || !newSite.name || !newSite.category || !newSite.url}
                      >
                        {createSiteMutation.isPending ? "Ekleniyor..." : "Site Ekle"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {embeddedSites && embeddedSites.length > 0 ? (
                  <div className="space-y-3">
                    {embeddedSites
                      .sort((a, b) => a.displayOrder - b.displayOrder)
                      .map((s) => (
                        <div
                          key={s.id}
                          className={`p-4 rounded-lg border ${s.isActive ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                          data-testid={`site-${s.id}`}
                        >
                          <div className="flex items-start gap-4">
                            {s.imageUrl && (
                              <div
                                className="w-24 h-16 rounded bg-cover bg-center border border-border flex-shrink-0"
                                style={{ backgroundImage: `url(${s.imageUrl})` }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-medium truncate">{s.name}</span>
                                <Badge variant="outline" className="flex-shrink-0">{s.category}</Badge>
                                {s.isActive ? (
                                  <Badge className="bg-primary text-primary-foreground">Aktif</Badge>
                                ) : (
                                  <Badge variant="outline">Pasif</Badge>
                                )}
                              </div>
                              {s.description && (
                                <p className="text-sm text-muted-foreground line-clamp-1 mb-1">{s.description}</p>
                              )}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <ExternalLink className="w-3 h-3" />
                                <span className="truncate">{s.url}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updateSiteMutation.mutate({ id: s.id, data: { isActive: !s.isActive } })}
                                data-testid={`button-toggle-site-${s.id}`}
                              >
                                {s.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditSite(s)}
                                data-testid={`button-edit-site-${s.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (confirm("Bu siteyi silmek istediginize emin misiniz?")) {
                                    deleteSiteMutation.mutate(s.id);
                                  }
                                }}
                                data-testid={`button-delete-site-${s.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gamepad2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Henüz gömmeli site yok</p>
                    <p className="text-sm mt-2">Oyunlar sayfasında gösterilecek siteler ekleyebilirsiniz</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Dialog open={isEditSiteOpen} onOpenChange={setIsEditSiteOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Site Düzenle</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-2">
                    <Label>İsim *</Label>
                    <Input
                      data-testid="input-edit-site-name"
                      value={editSiteData.name}
                      onChange={(e) => setEditSiteData({ ...editSiteData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Açıklama</Label>
                    <Textarea
                      data-testid="input-edit-site-description"
                      value={editSiteData.description}
                      onChange={(e) => setEditSiteData({ ...editSiteData, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kategori *</Label>
                    <Input
                      data-testid="input-edit-site-category"
                      value={editSiteData.category}
                      onChange={(e) => setEditSiteData({ ...editSiteData, category: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL *</Label>
                    <Input
                      data-testid="input-edit-site-url"
                      value={editSiteData.url}
                      onChange={(e) => setEditSiteData({ ...editSiteData, url: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Görsel URL</Label>
                    <Input
                      data-testid="input-edit-site-image"
                      value={editSiteData.imageUrl}
                      onChange={(e) => setEditSiteData({ ...editSiteData, imageUrl: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sıralama</Label>
                    <Input
                      data-testid="input-edit-site-order"
                      type="number"
                      value={editSiteData.displayOrder}
                      onChange={(e) => setEditSiteData({ ...editSiteData, displayOrder: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Aktif</Label>
                    <Switch
                      checked={editSiteData.isActive}
                      onCheckedChange={(checked) => setEditSiteData({ ...editSiteData, isActive: checked })}
                      data-testid="switch-edit-site-active"
                    />
                  </div>
                  <Button
                    className="w-full"
                    data-testid="button-submit-edit-site"
                    onClick={() => {
                      if (selectedSite) {
                        updateSiteMutation.mutate({ id: selectedSite.id, data: editSiteData });
                      }
                    }}
                    disabled={updateSiteMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateSiteMutation.isPending ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

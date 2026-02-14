import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertChatMessageSchema, insertTicketSchema, insertAnnouncementSchema, adminCreateUserSchema, insertBannerSchema, insertEmbeddedSiteSchema } from "@shared/schema";
import session from "express-session";
import MemoryStore from "memorystore";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

const MemoryStoreSession = MemoryStore(session);

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Yetkisiz erişim" });
  }
  next();
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await storage.seedInitialData();
  
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "platform-secret-key-2024",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStoreSession({
        checkPeriod: 86400000,
      }),
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );


  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(validatedData.username);
      if (!user || user.password !== validatedData.password) {
        return res.status(401).json({ message: "Kullanıcı adı veya şifre hatalı" });
      }

      await storage.updateUser(user.id, { isOnline: true });
      req.session.userId = user.id;
      
      if (validatedData.rememberMe) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Giriş başarısız" });
    }
  });

  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    if (req.session.userId) {
      await storage.updateUser(req.session.userId, { isOnline: false });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Çıkış yapılamadı" });
      }
      res.json({ message: "Çıkış başarılı" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Oturum bulunamadı" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.patch("/api/user/profile", requireAuth, async (req, res) => {
    const { avatar, displayName } = req.body;
    const updates: Record<string, any> = {};
    
    if (avatar !== undefined) updates.avatar = avatar;
    if (displayName) updates.displayName = displayName;
    
    const user = await storage.updateUser(req.session.userId!, updates);
    if (!user) {
      return res.status(404).json({ message: "Kullanici bulunamadi" });
    }
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.get("/api/stats", requireAuth, async (req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  app.get("/api/users", requireAuth, async (req, res) => {
    const users = await storage.getAllUsers();
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);
    res.json(usersWithoutPasswords);
  });

  app.get("/api/admin/users", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }
    
    const users = await storage.getAllUsers();
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);
    res.json(usersWithoutPasswords);
  });

  app.get("/api/events", requireAuth, async (req, res) => {
    const events = await storage.getEvents();
    res.json(events);
  });

  app.get("/api/events/:id", requireAuth, async (req, res) => {
    const event = await storage.getEvent(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Etkinlik bulunamadı" });
    }
    res.json(event);
  });

  app.get("/api/chat/groups", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (!currentUser) {
      return res.status(401).json({ message: "Kullanici bulunamadi" });
    }

    const allGroups = await storage.getChatGroups();
    const roleHierarchy: Record<string, number> = {
      USER: 1,
      VIP: 2,
      MOD: 3,
      ADMIN: 4,
    };
    const userLevel = roleHierarchy[currentUser.role] || 1;

    const filteredGroups = allGroups.filter((group) => {
      if (group.isPrivate) {
        return group.participants?.includes(currentUser.id);
      }
      const requiredLevel = roleHierarchy[group.requiredRole || "USER"] || 1;
      return userLevel >= requiredLevel;
    });

    res.json(filteredGroups);
  });

  app.post("/api/chat/private", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN" && currentUser?.role !== "MOD") {
      return res.status(403).json({ message: "Yetkisiz erisim" });
    }

    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ message: "Hedef kullanici gerekli" });
    }

    const targetUser = await storage.getUser(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: "Kullanici bulunamadi" });
    }

    const allGroups = await storage.getChatGroups();
    const existingChat = allGroups.find(
      (g) =>
        g.isPrivate &&
        g.participants?.includes(currentUser.id) &&
        g.participants?.includes(targetUserId)
    );

    if (existingChat) {
      return res.json(existingChat);
    }

    const group = await storage.createChatGroup({
      name: `${currentUser.displayName} - ${targetUser.displayName}`,
      description: "Ozel sohbet",
      createdBy: currentUser.id,
      isPrivate: true,
      participants: [currentUser.id, targetUserId],
    });

    res.status(201).json(group);
  });

  app.get("/api/chat/messages", requireAuth, async (req, res) => {
    const groupId = req.query.groupId as string;
    if (!groupId) {
      return res.status(400).json({ message: "Group ID gerekli" });
    }

    const messages = await storage.getChatMessages(groupId);
    
    const messagesWithUsers = await Promise.all(
      messages.map(async (msg) => {
        const user = await storage.getUser(msg.userId);
        if (!user) {
          return { ...msg, user: null };
        }
        const { password, ...userWithoutPassword } = user;
        return { ...msg, user: userWithoutPassword };
      })
    );
    
    res.json(messagesWithUsers);
  });

  app.post("/api/chat/messages", requireAuth, async (req, res) => {
    try {
      const validatedData = insertChatMessageSchema.parse(req.body);
      
      const message = await storage.createChatMessage({
        ...validatedData,
        userId: req.session.userId!,
      });
      
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        res.status(201).json({ ...message, user: null });
        return;
      }
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json({ ...message, user: userWithoutPassword });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Mesaj gönderilemedi" });
    }
  });

  app.post("/api/chat/groups", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN" && currentUser?.role !== "MOD") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    try {
      const { name, description } = req.body;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ message: "Grup adı gerekli" });
      }

      const group = await storage.createChatGroup({
        name: name.trim(),
        description: description?.trim() || null,
        createdBy: req.session.userId!,
      });

      res.status(201).json(group);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Grup oluşturulamadı" });
    }
  });

  app.delete("/api/chat/groups/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const deleted = await storage.deleteChatGroup(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Grup bulunamadı" });
    }
    res.json({ message: "Grup silindi" });
  });

  app.get("/api/chat/groups/:id/messages", requireAuth, async (req, res) => {
    const messages = await storage.getChatMessages(req.params.id);
    
    const messagesWithUsers = await Promise.all(
      messages.map(async (msg) => {
        const user = await storage.getUser(msg.userId);
        if (!user) {
          return { ...msg, user: null };
        }
        const { password, ...userWithoutPassword } = user;
        return { ...msg, user: userWithoutPassword };
      })
    );
    
    res.json(messagesWithUsers);
  });

  app.post("/api/chat/groups/:id/messages", requireAuth, async (req, res) => {
    try {
      const validatedData = insertChatMessageSchema.parse({
        ...req.body,
        groupId: req.params.id,
      });
      
      const message = await storage.createChatMessage({
        ...validatedData,
        userId: req.session.userId!,
      });
      
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        res.status(201).json({ ...message, user: null });
        return;
      }
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json({ ...message, user: userWithoutPassword });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Mesaj gönderilemedi" });
    }
  });

  app.delete("/api/chat/groups/:id/messages", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN" && currentUser?.role !== "MOD") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const count = await storage.deleteGroupMessages(req.params.id);
    res.json({ message: `${count} mesaj silindi` });
  });

  app.patch("/api/chat/messages/:id", requireAuth, async (req, res) => {
    try {
      const message = await storage.getChatMessage(req.params.id);
      if (!message) {
        return res.status(404).json({ message: "Mesaj bulunamadı" });
      }

      if (message.userId !== req.session.userId) {
        return res.status(403).json({ message: "Sadece kendi mesajınızı düzenleyebilirsiniz" });
      }

      const updated = await storage.updateChatMessage(req.params.id, { content: req.body.content });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Mesaj güncellenemedi" });
    }
  });

  app.delete("/api/chat/messages/:id", requireAuth, async (req, res) => {
    const message = await storage.getChatMessage(req.params.id);
    if (!message) {
      return res.status(404).json({ message: "Mesaj bulunamadı" });
    }

    const currentUser = await storage.getUser(req.session.userId!);
    const isOwner = message.userId === req.session.userId;
    const isModerator = currentUser?.role === "ADMIN" || currentUser?.role === "MOD";

    if (!isOwner && !isModerator) {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const deleted = await storage.deleteChatMessage(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Mesaj bulunamadı" });
    }
    res.json({ message: "Mesaj silindi" });
  });

  app.get("/api/tickets", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    
    let tickets;
    if (currentUser?.role === "ADMIN" || currentUser?.role === "MOD") {
      tickets = await storage.getTickets();
    } else {
      tickets = await storage.getTickets(req.session.userId);
    }
    
    res.json(tickets);
  });

  app.get("/api/admin/tickets/recent", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }
    
    const tickets = await storage.getTickets();
    res.json(tickets.slice(0, 10));
  });

  app.post("/api/tickets", requireAuth, async (req, res) => {
    try {
      const validatedData = insertTicketSchema.parse(req.body);
      
      const ticket = await storage.createTicket({
        ...validatedData,
        userId: req.session.userId!,
      });
      
      res.status(201).json(ticket);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Talep oluşturulamadı" });
    }
  });

  app.patch("/api/tickets/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN" && currentUser?.role !== "MOD") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }
    
    const ticket = await storage.updateTicket(req.params.id, req.body);
    if (!ticket) {
      return res.status(404).json({ message: "Talep bulunamadı" });
    }
    
    res.json(ticket);
  });

  app.get("/api/announcements", async (req, res) => {
    const announcements = await storage.getAnnouncements();
    res.json(announcements);
  });

  app.get("/api/announcements/active", async (req, res) => {
    const announcement = await storage.getActiveAnnouncement();
    res.json(announcement || null);
  });

  app.post("/api/admin/announcements", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    try {
      const validatedData = insertAnnouncementSchema.parse(req.body);
      const announcement = await storage.createAnnouncement({
        ...validatedData,
        createdBy: req.session.userId!,
      });
      res.status(201).json(announcement);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Duyuru oluşturulamadı" });
    }
  });

  app.delete("/api/admin/announcements/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const deleted = await storage.deleteAnnouncement(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Duyuru bulunamadı" });
    }
    res.json({ message: "Duyuru silindi" });
  });

  app.post("/api/admin/users", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    try {
      const validatedData = adminCreateUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Bu kullanıcı adı zaten kullanılıyor" });
      }

      const user = await storage.createUserByAdmin(validatedData);
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Kullanıcı oluşturulamadı" });
    }
  });

  app.patch("/api/admin/users/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const { role, level, displayName } = req.body;
    const updates: Record<string, any> = {};
    if (role) updates.role = role;
    if (level !== undefined) updates.level = level;
    if (displayName) updates.displayName = displayName;

    const user = await storage.updateUser(req.params.id, updates);
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.delete("/api/admin/users/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    if (req.params.id === req.session.userId) {
      return res.status(400).json({ message: "Kendinizi silemezsiniz" });
    }

    const deleted = await storage.deleteUser(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }
    res.json({ message: "Kullanıcı silindi" });
  });

  app.get("/api/settings/film", requireAuth, async (req, res) => {
    const filmUrl = await storage.getSetting("filmUrl");
    res.json({ filmUrl: filmUrl || "" });
  });

  app.post("/api/settings/film", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const { filmUrl } = req.body;
    await storage.setSetting("filmUrl", filmUrl || "");
    res.json({ filmUrl: filmUrl || "" });
  });

  // Background music settings - public GET for all users
  app.get("/api/settings/music", async (req, res) => {
    const musicUrl = await storage.getSetting("musicUrl");
    res.json({ musicUrl: musicUrl || "" });
  });

  app.post("/api/settings/music", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const { musicUrl } = req.body;
    await storage.setSetting("musicUrl", musicUrl || "");
    res.json({ musicUrl: musicUrl || "" });
  });

  app.get("/api/vip/apps", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (!currentUser || !["VIP", "MOD", "ADMIN"].includes(currentUser.role)) {
      return res.status(403).json({ message: "VIP erisimi gerekli" });
    }
    const apps = await storage.getVipApps();
    res.json(apps);
  });

  app.post("/api/vip/apps", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const { name, description, imageUrl, downloadUrl, version, size } = req.body;
    if (!name || !downloadUrl) {
      return res.status(400).json({ message: "Uygulama adi ve indirme linki gerekli" });
    }

    const app = await storage.createVipApp({
      name,
      description: description || "",
      imageUrl: imageUrl || "",
      downloadUrl,
      version: version || "",
      size: size || "",
    });
    res.status(201).json(app);
  });

  app.delete("/api/vip/apps/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const deleted = await storage.deleteVipApp(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Uygulama bulunamadi" });
    }
    res.json({ success: true });
  });

  // Public banners endpoint - no auth required
  app.get("/api/banners", async (req, res) => {
    const banners = await storage.getActiveBanners();
    res.json(banners);
  });

  app.get("/api/admin/banners", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }
    const banners = await storage.getBanners();
    res.json(banners);
  });

  app.post("/api/admin/banners", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    try {
      const validatedData = insertBannerSchema.parse(req.body);
      const banner = await storage.createBanner({
        ...validatedData,
        createdBy: req.session.userId!,
      });
      res.status(201).json(banner);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Banner oluşturulamadı" });
    }
  });

  app.patch("/api/admin/banners/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const banner = await storage.updateBanner(req.params.id, req.body);
    if (!banner) {
      return res.status(404).json({ message: "Banner bulunamadı" });
    }
    res.json(banner);
  });

  app.delete("/api/admin/banners/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const deleted = await storage.deleteBanner(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Banner bulunamadı" });
    }
    res.json({ success: true });
  });

  // Featured members (Ayın Elemanı) settings - public GET
  app.get("/api/settings/featured-members", async (req, res) => {
    const data = await storage.getSetting("featuredMembers");
    if (!data) {
      return res.json({ member1: null, member2: null, member3: null });
    }
    try {
      const parsed = JSON.parse(data);
      res.json(parsed);
    } catch {
      res.json({ member1: null, member2: null, member3: null });
    }
  });

  app.post("/api/settings/featured-members", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const { member1, member2, member3 } = req.body;
    const data = JSON.stringify({ member1, member2, member3 });
    await storage.setSetting("featuredMembers", data);
    res.json({ member1, member2, member3 });
  });

  // Site branding settings - public GET
  app.get("/api/settings/branding", async (req, res) => {
    const data = await storage.getSetting("branding");
    if (!data) {
      return res.json({ siteName: "JOY", showFlag: true });
    }
    try {
      const parsed = JSON.parse(data);
      res.json(parsed);
    } catch {
      res.json({ siteName: "JOY", showFlag: true });
    }
  });

  app.post("/api/settings/branding", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const { siteName, showFlag } = req.body;
    const data = JSON.stringify({ siteName: siteName || "JOY", showFlag: showFlag !== false });
    await storage.setSetting("branding", data);
    res.json({ siteName: siteName || "JOY", showFlag: showFlag !== false });
  });

  // Embedded Sites Routes
  app.get("/api/embedded-sites", requireAuth, async (req, res) => {
    try {
      const sites = await storage.getActiveEmbeddedSites();
      res.json(sites);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Siteler alınamadı" });
    }
  });

  app.get("/api/admin/embedded-sites", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }
    try {
      const sites = await storage.getEmbeddedSites();
      res.json(sites);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Siteler alınamadı" });
    }
  });

  app.post("/api/admin/embedded-sites", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }
    try {
      const validatedData = insertEmbeddedSiteSchema.parse(req.body);
      const site = await storage.createEmbeddedSite({
        ...validatedData,
        createdBy: req.session.userId!,
      });
      res.json(site);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Site eklenemedi" });
    }
  });

  app.patch("/api/admin/embedded-sites/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }
    try {
      const site = await storage.updateEmbeddedSite(req.params.id, req.body);
      if (!site) {
        return res.status(404).json({ message: "Site bulunamadı" });
      }
      res.json(site);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Site güncellenemedi" });
    }
  });

  app.delete("/api/admin/embedded-sites/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }
    try {
      const success = await storage.deleteEmbeddedSite(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Site bulunamadı" });
      }
      res.json({ message: "Site silindi" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Site silinemedi" });
    }
  });

  // Ticket Management Routes
  app.patch("/api/tickets/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN" && currentUser?.role !== "MOD") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }
    try {
      const ticket = await storage.updateTicket(req.params.id, req.body);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket bulunamadı" });
      }
      res.json(ticket);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Ticket güncellenemedi" });
    }
  });

  app.delete("/api/tickets/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (currentUser?.role !== "ADMIN" && currentUser?.role !== "MOD") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }
    try {
      const success = await storage.deleteTicket(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Ticket bulunamadı" });
      }
      res.json({ message: "Ticket silindi" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Ticket silinemedi" });
    }
  });

  return httpServer;
}

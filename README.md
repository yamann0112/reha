# Reha Platform

Modern sosyal platform - canlı etkinlikler, sohbet, destek sistemi ve gömülü içerik özellikleriyle.

## Özellikler

- 🎭 Canlı etkinlik yönetimi
- 💬 Facebook Messenger tarzı sohbet sistemi
- 🎫 Destek ticket sistemi
- 📢 Duyuru yönetimi
- 🎮 Gömülü site entegrasyonu
- 👥 Kullanıcı rolleri (Admin, Moderatör, VIP, Normal)
- 🎵 Otomatik müzik çalma
- 🎨 Banner yönetimi

## Hızlı Başlangıç

### Gereksinimler

- Node.js 20+
- PostgreSQL 14+
- npm

### Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Veritabanını hazırla
npm run db:push

# Geliştirme modunda çalıştır
npm run dev

# Production build
npm run build
npm start
```

### Ortam Değişkenleri

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/db
SESSION_SECRET=your-secret-key
NODE_ENV=production
```

## Railway Deployment

Bu proje Railway'de otomatik deploy için hazırlanmıştır:

1. GitHub repository'yi Railway'e bağlayın
2. PostgreSQL servisini ekleyin
3. Environment variables'ı ayarlayın
4. Deploy!

## Teknolojiler

- **Frontend:** React, Vite, TailwindCSS, Wouter
- **Backend:** Express, TypeScript
- **Database:** PostgreSQL, Drizzle ORM
- **Deployment:** Railway, Nixpacks

## Lisans

MIT

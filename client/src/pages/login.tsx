import { useState } from "react";
import { useLocation, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LogIn, UserPlus, Crown, Shield } from "lucide-react";

export default function Login() {
  const { isAuthenticated, login: authLogin } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || (!isLogin && !displayName)) return;

    setIsLoading(true);
    try {
      if (isLogin) {
        const response = await apiRequest("POST", "/api/auth/login", { username, password, rememberMe });
        const user = await response.json();
        
        if (rememberMe) {
          localStorage.setItem("joy_username", username);
        }
        
        authLogin(user);
        setLocation("/dashboard");
      } else {
        const response = await apiRequest("POST", "/api/auth/register", { username, password, displayName });
        const user = await response.json();
        authLogin(user);
        setLocation("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || (isLogin ? "Giriş yapılamadı" : "Kayıt olunamadı"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-background p-4">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative z-10 border-primary/30 shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 flex items-center justify-center shadow-lg">
              {isLogin ? (
                <LogIn className="w-8 h-8 text-black" />
              ) : (
                <UserPlus className="w-8 h-8 text-black" />
              )}
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-yellow-500 to-primary bg-clip-text text-transparent">
            REHA.COM
          </CardTitle>
          <CardDescription className="text-base">
            {isLogin ? "Hesabınıza giriş yapın" : "Yeni hesap oluşturun"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Görünür Ad</label>
                <Input
                  type="text"
                  placeholder="Adınız Soyadınız"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-11"
                  data-testid="input-displayname"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Kullanıcı Adı</label>
              <Input
                type="text"
                placeholder="kullaniciadi"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11"
                data-testid="input-username"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Şifre</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
                data-testid="input-password"
              />
            </div>

            {isLogin && (
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe} 
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  data-testid="checkbox-remember"
                />
                <label htmlFor="remember" className="text-sm cursor-pointer">
                  Beni Hatırla
                </label>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={isLoading || !username || !password || (!isLogin && !displayName)}
              className="w-full h-11 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 text-black font-semibold hover:opacity-90"
              data-testid="button-submit"
            >
              {isLoading ? "Lütfen bekleyin..." : isLogin ? "Giriş Yap" : "Kayıt Ol"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary hover:underline"
              data-testid="button-toggle-mode"
            >
              {isLogin ? "Hesabınız yok mu? Kayıt olun" : "Zaten hesabınız var mı? Giriş yapın"}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t space-y-2">
            <p className="text-xs text-center text-muted-foreground">Premium Özellikler</p>
            <div className="flex justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Crown className="w-3 h-3 text-yellow-500" />
                <span>VIP</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-primary" />
                <span>Güvenli</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

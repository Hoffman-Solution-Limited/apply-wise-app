import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BrandLogo } from "@/components/BrandLogo";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User, Loader2, Globe } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({
          title: "Check your email",
          description: "We sent you a verification link to confirm your account.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // resume upload is handled on Profile page after sign in

  const oidcProvider = (import.meta.env.VITE_OIDC_PROVIDER as string) ?? '';
  const linkedInProvider = (import.meta.env.VITE_LINKEDIN_PROVIDER as string) || "linkedin_oidc";

  const signInWithProvider = async (provider: string, fallbackProvider?: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: { redirectTo: window.location.origin },
      });

      if (error && fallbackProvider) {
        const shouldTryFallback = /provider|oauth|enabled|unsupported|unknown/i.test(error.message);
        if (shouldTryFallback) {
          const { error: fallbackError } = await supabase.auth.signInWithOAuth({
            provider: fallbackProvider as any,
            options: { redirectTo: window.location.origin },
          });
          if (fallbackError) throw fallbackError;
          return;
        }
      }

      if (error) throw error;
      // Supabase will redirect for OAuth flows
    } catch (err: any) {
      toast({ title: 'OAuth Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      toast({
        title: "Email required",
        description: "Enter your registered email to continue.",
        variant: "destructive",
      });
      return;
    }

    setForgotLoading(true);
    try {
      const normalizedEmail = forgotEmail.trim();
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setEmail(normalizedEmail);
      setForgotOpen(false);
      toast({
        title: "Reset link sent",
        description: "Check your email for instructions to reset your password.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8 space-y-3">
          <BrandLogo size="lg" showTagline className="justify-center" />
          <p className="text-muted-foreground mt-1 text-sm">
            {isLogin ? "Welcome back" : "Create your account"}
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  required
                  minLength={6}
                />
              </div>
              {isLogin && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotOpen(true);
                    }}
                    className="text-xs text-primary hover:underline"
                    disabled={loading}
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-medium">Continue with</h2>
            <div className="flex gap-3 flex-col mt-3">
              <Button type="button" onClick={() => signInWithProvider('google')} disabled={loading} className="flex items-center justify-center gap-2 border">
                <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M44.5 20H24v8.5h11.9C34.3 33.7 29.6 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.4 0 6.4 1.3 8.7 3.4l6.1-6.1C34.6 6.7 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8.9 20-20 0-1.3-.1-2.6-.5-3.8z" fill="#FFC107"/>
                  <path d="M6.3 14.7l7 5.1C15.9 16 19.7 13 24 13c3.4 0 6.4 1.3 8.7 3.4l6.1-6.1C34.6 6.7 29.6 4 24 4 16.6 4 10 8.9 6.3 14.7z" fill="#FF3D00"/>
                  <path d="M24 44c5.6 0 10.6-1.9 14.4-5.1l-6.9-5.6C29.9 33.6 27.1 34.5 24 34.5c-5.6 0-10.3-3.3-12-8.1l-7 5.1C6 37.6 14 44 24 44z" fill="#4CAF50"/>
                  <path d="M44.5 20H24v8.5h11.9C35 31 30.5 34.5 24 34.5v9.5C34 44 44.5 35.6 44.5 20z" fill="#1976D2"/>
                </svg>
                Sign in with Google
              </Button>

              <Button
                type="button"
                onClick={() =>
                  signInWithProvider(
                    linkedInProvider,
                    linkedInProvider === "linkedin_oidc" ? "linkedin" : "linkedin_oidc"
                  )
                }
                disabled={loading}
                className="flex items-center justify-center gap-2 border"
              >
                <svg width="18" height="18" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <rect width="34" height="34" rx="4" fill="#0A66C2"/>
                  <path d="M8.7 12.2h3.4V26h-3.4v-13.8zM10.4 9.8c1.1 0 1.8.7 1.8 1.6 0 .9-.7 1.6-1.8 1.6s-1.8-.7-1.8-1.6c0-.9.7-1.6 1.8-1.6zM13.8 12.2H17v1.9h.1c.4-.8 1.5-1.6 3.2-1.6 3.4 0 4 2.2 4 5V26h-3.4v-6.3c0-1.5 0-3.5-2.1-3.5-2.1 0-2.4 1.6-2.4 3.4V26H13.8v-13.8z" fill="#fff"/>
                </svg>
                Sign in with LinkedIn
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                <p>Or sign up with email to create an account. You can upload your resume from your profile after signing in.</p>
                <p className="mt-2"><Link to="/profile" className="text-primary hover:underline">Go to Profile</Link></p>
              </div>
              {oidcProvider && (
                <div className="mt-2">
                  <Button type="button" onClick={() => signInWithProvider(oidcProvider)} disabled={loading} className="flex items-center justify-center gap-2 border">
                    <Globe className="w-4 h-4" />
                    Sign in with OpenID Connect
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
            <DialogDescription>
              Enter the email you registered with and we will send you a reset link.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleForgotPassword();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Registered email</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="you@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                disabled={forgotLoading}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setForgotOpen(false)}
                disabled={forgotLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={forgotLoading}>
                {forgotLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send Reset Link
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuthPage;

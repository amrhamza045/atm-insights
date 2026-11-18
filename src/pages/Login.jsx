import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, UtensilsCrossed, ShieldCheck, Mail, Lock, User, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const { checkAppState } = useAuth();

  const [activeTab, setActiveTab] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handlePostLoginRedirect = () => {
    if (redirectParam) {
      try {
        const parsed = new URL(redirectParam, window.location.origin);
        navigate(parsed.pathname + parsed.search, { replace: true });
        return;
      } catch {
        // Fallback if not a full URL
        navigate(redirectParam, { replace: true });
        return;
      }
    }
    navigate('/Packages', { replace: true });
  };

  // Sign In with Supabase Auth
  const handleSignIn = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data?.session) {
        await checkAppState();
        handlePostLoginRedirect();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Sign Up with Supabase Auth
  const handleSignUp = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || 'Staff Member',
            role: 'staff',
          },
        },
      });

      if (error) throw error;

      if (data?.session) {
        await checkAppState();
        handlePostLoginRedirect();
      } else {
        setSuccessMsg('Account created! Please check your email to confirm your account, or sign in.');
        setActiveTab('signin');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to sign up.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo / Admin Login for local development & testing
  const handleDemoAdminLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const adminEmail = 'admin@rosemary.com';
    const adminPass = 'RosemaryAdmin2026!';

    try {
      // 1. Try signing in directly
      let { data, error } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPass,
      });

      // 2. If user doesn't exist, create it automatically
      if (error && (error.message.includes('Invalid login') || error.message.includes('User not found'))) {
        const signUpRes = await supabase.auth.signUp({
          email: adminEmail,
          password: adminPass,
          options: {
            data: {
              full_name: 'Rosemary Admin',
              role: 'admin',
            },
          },
        });

        if (signUpRes.error) {
          // If auto sign-up fails (e.g. email confirmation required), sign in with mock admin session
          localStorage.setItem('rosemary_demo_admin', 'true');
        } else {
          data = signUpRes.data;
        }
      } else if (error) {
        // Any other error, set local fallback admin flag
        localStorage.setItem('rosemary_demo_admin', 'true');
      }

      await checkAppState();
      handlePostLoginRedirect();
    } catch (err) {
      console.warn('Demo login notice:', err);
      localStorage.setItem('rosemary_demo_admin', 'true');
      await checkAppState();
      handlePostLoginRedirect();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Back to website button */}
      <div className="w-full max-w-md mb-4 flex justify-between items-center z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="text-slate-400 hover:text-white hover:bg-slate-800 gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to website
        </Button>
      </div>

      <Card className="w-full max-w-md bg-slate-800/90 border-slate-700 backdrop-blur shadow-2xl z-10 text-white">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-12 h-12 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center mb-3">
            <UtensilsCrossed className="w-6 h-6 text-amber-400" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            Rosemary ERP
          </CardTitle>
          <CardDescription className="text-slate-400">
            Catering & Restaurant Management Portal
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {errorMsg && (
            <Alert variant="destructive" className="bg-red-950/60 border-red-800 text-red-200">
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          {successMsg && (
            <Alert className="bg-emerald-950/60 border-emerald-800 text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mr-2" />
              <AlertDescription>{successMsg}</AlertDescription>
            </Alert>
          )}

          {/* Quick Demo / Admin Access */}
          <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-medium text-sm text-amber-300">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Instant Development & Demo Access</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Launch directly into all 60 pages and modules with full Administrator privileges:
            </p>
            <Button
              type="button"
              onClick={handleDemoAdminLogin}
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold h-10 shadow-md gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Sign In as Demo Admin
                </>
              )}
            </Button>
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-800 px-2 text-slate-400">Or sign in with email</span>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-900/60 border border-slate-700">
              <TabsTrigger value="signin" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950">
                Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 pt-3">
              <form onSubmit={handleSignIn} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="signin-email" className="text-slate-300 text-xs">Email</Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="user@rosemary.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-slate-900/60 border-slate-700 pl-9 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signin-password" className="text-slate-300 text-xs">Password</Label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-slate-900/60 border-slate-700 pl-9 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium h-10 gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 pt-3">
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name" className="text-slate-300 text-xs">Full Name</Label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-slate-900/60 border-slate-700 pl-9 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-slate-300 text-xs">Email</Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="user@rosemary.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-slate-900/60 border-slate-700 pl-9 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-slate-300 text-xs">Password</Label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-slate-900/60 border-slate-700 pl-9 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium h-10 gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="pt-2 pb-5 text-center text-xs text-slate-500 justify-center">
          Connected to Supabase · Rosemary Catering ERP
        </CardFooter>
      </Card>
    </div>
  );
}

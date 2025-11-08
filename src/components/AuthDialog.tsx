import { useState } from 'react';
import { Mail, Lock, User, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { motion, AnimatePresence } from 'motion/react';

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAuth: (user: { email: string; name: string }) => void;
}

export function AuthDialog({ isOpen, onClose, onAuth }: AuthDialogProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const resolvedName = name.trim() || email.split('@')[0] || '';

    onAuth({ 
      email, 
      name: resolvedName
    });
    onClose();
  };

  const isValid = Boolean(email && password && (isLogin || name));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Label htmlFor="name" className="text-neutral-700">Name</Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 pl-10 border-neutral-300 focus:border-neutral-900"
                    disabled={isLoading}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <Label htmlFor="email" className="text-neutral-700">Email</Label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 pl-10 border-neutral-300 focus:border-neutral-900"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password" className="text-neutral-700">Password</Label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pl-10 border-neutral-300 focus:border-neutral-900"
                disabled={isLoading}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={!isValid || isLoading}
            className="w-full h-11 bg-neutral-900 hover:bg-neutral-800"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Please wait...</span>
              </div>
            ) : (
              <span>{isLogin ? 'Sign in' : 'Create account'}</span>
            )}
          </Button>

          <div className="text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
              type="button"
            >
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <span className="text-neutral-900">
                {isLogin ? 'Sign up' : 'Sign in'}
              </span>
            </button>
          </div>
        </form>

        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-neutral-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-900 mb-1">Pro tip</p>
              <p className="text-xs text-neutral-600">
                Sign up to save your progress and sync across devices
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

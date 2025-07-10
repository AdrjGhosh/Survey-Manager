import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User, AuthState } from '../types/auth';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // In development mode without Supabase, create a mock user
      const mockUser: User = {
        id: 'dev-user-123',
        email: 'developer@example.com',
        created_at: new Date().toISOString(),
      };
      
      console.log('Using mock user for development:', mockUser);
      setAuthState({
        user: mockUser,
        loading: false,
        error: null,
      });
      return;
    }

    console.log('Initializing Supabase authentication...');
    
    // Get initial session
    supabase!.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', {
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email
      });
      
      setAuthState(prev => ({
        ...prev,
        user: session?.user ? {
          id: session.user.id,
          email: session.user.email!,
          created_at: session.user.created_at,
        } : null,
        loading: false,
      }));
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase!.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', {
          event,
          hasSession: !!session,
          userId: session?.user?.id
        });
        
        setAuthState(prev => ({
          ...prev,
          user: session?.user ? {
            id: session.user.id,
            email: session.user.email!,
            created_at: session.user.created_at,
          } : null,
          loading: false,
          error: null,
        }));
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Authentication requires Supabase configuration');
    }

    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { data, error } = await supabase!.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        setAuthState(prev => ({ ...prev, loading: false, error: error.message }));
        throw error;
      }

      console.log('Sign in successful:', data.user?.email);
    } catch (error) {
      console.error('Sign in failed:', error);
      setAuthState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Authentication requires Supabase configuration');
    }

    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { data, error } = await supabase!.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('Sign up error:', error);
        setAuthState(prev => ({ ...prev, loading: false, error: error.message }));
        throw error;
      }

      console.log('Sign up successful:', data.user?.email);
    } catch (error) {
      console.error('Sign up failed:', error);
      setAuthState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      return;
    }

    setAuthState(prev => ({ ...prev, loading: true }));
    
    const { error } = await supabase!.auth.signOut();
    
    if (error) {
      setAuthState(prev => ({ ...prev, loading: false, error: error.message }));
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Password reset requires Supabase configuration');
    }

    const { error } = await supabase!.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    ...authState,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

const Login = () => {
  const { login, isAuthenticated, loading } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  // Redirect if already authenticated
  if (isAuthenticated && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Add artificial delay for effect
    await new Promise(r => setTimeout(r, 800));
    try {
      await login(formData.username, formData.password);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-blue-500 animate-spin"></div>
          <div className="absolute top-0 left-0 h-24 w-24 rounded-full border-t-4 border-b-4 border-purple-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0f172a]">
      {/* Dynamic Animated Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-r from-purple-600/30 to-blue-600/30 blur-[120px] animate-pulse-slow"></div>
        <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-indigo-500/20 to-teal-400/20 blur-[100px] animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-gradient-to-t from-pink-500/20 to-rose-500/20 blur-[100px] animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10 px-4">

        {/* Left Side: Brand & Visuals (Desktop) */}
        <div className="hidden lg:flex flex-col justify-center space-y-8 pr-12">
          <div className="space-y-4 animate-slide-in">
            <div className="inline-flex items-center px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 backdrop-blur-sm text-blue-300 text-xs font-semibold uppercase tracking-wider">
              <Zap className="w-3 h-3 mr-2 text-yellow-400 fill-yellow-400" /> Next-Gen Attendance
            </div>
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-white/50 leading-tight drop-shadow-sm">
              Secure.<br />Fast.<br />Smart.
            </h1>
            <p className="text-lg text-blue-200/60 max-w-md leading-relaxed">
              Experience the future of school management with facial recognition, RFID tracking, and real-time analytics.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mb-3" />
              <div className="text-white font-bold">Bank-Grade Security</div>
              <div className="text-xs text-gray-400 mt-1">End-to-end encrypted data protection.</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <User className="w-8 h-8 text-purple-400 mb-3" />
              <div className="text-white font-bold">Role-Based Access</div>
              <div className="text-xs text-gray-400 mt-1">Custom dashboards for Admins, Teachers & Students.</div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] p-1 overflow-hidden animate-scale-in">
            <div className="bg-gray-900/80 backdrop-blur-xl rounded-[20px] p-8 md:p-10 relative overflow-hidden group">

              {/* Background Shine Effect */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-white tracking-tight">Welcome Back</h2>
                <p className="text-base text-gray-400 mt-2">Enter your credentials to access the portal</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <div className={`relative transition-all duration-300 ${focusedField === 'username' ? 'scale-105' : ''}`}>
                    <label className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1.5 block ml-1">Username</label>
                    <div className="relative group/input">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                        <User className={`h-5 w-5 transition-colors duration-300 ${focusedField === 'username' ? 'text-blue-400' : 'text-gray-500'}`} />
                      </div>
                      <input
                        name="username"
                        type="text"
                        required
                        className="block w-full pl-11 pr-4 py-4 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-300"
                        placeholder="Enter your username"
                        value={formData.username}
                        onChange={handleChange}
                        onFocus={() => setFocusedField('username')}
                        onBlur={() => setFocusedField(null)}
                      />
                      <div className="absolute inset-0 rounded-xl bg-blue-500/20 opacity-0 group-hover/input:opacity-100 transition-opacity pointer-events-none blur-sm -z-10"></div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className={`relative transition-all duration-300 ${focusedField === 'password' ? 'scale-105' : ''}`}>
                    <label className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1.5 block ml-1">Password</label>
                    <div className="relative group/input">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                        <Lock className={`h-5 w-5 transition-colors duration-300 ${focusedField === 'password' ? 'text-blue-400' : 'text-gray-500'}`} />
                      </div>
                      <input
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        className="block w-full pl-11 pr-12 py-4 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-300"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleChange}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-blue-400 transition-colors z-10"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                      <div className="absolute inset-0 rounded-xl bg-blue-500/20 opacity-0 group-hover/input:opacity-100 transition-opacity pointer-events-none blur-sm -z-10"></div>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-blue-500/25 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed group/btn"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    ) : (
                      <span className="flex items-center text-base">
                        Sign In to Dashboard <ArrowRight className="ml-2 w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                      </span>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-800">
                <div className="text-center mb-4">
                  <span className="bg-gray-900 px-3 text-xs text-gray-500 uppercase tracking-widest font-semibold">Quick Access</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setFormData({ username: 'admin', password: 'admin123' })} className="py-2 px-2 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-400 text-xs font-medium hover:bg-gray-700 hover:text-white hover:border-blue-500/50 transition-all duration-200">
                    ADMIN
                  </button>
                  <button onClick={() => setFormData({ username: 'teacher', password: 'teacher123' })} className="py-2 px-2 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-400 text-xs font-medium hover:bg-gray-700 hover:text-white hover:border-blue-500/50 transition-all duration-200">
                    TEACHER
                  </button>
                  <button onClick={() => setFormData({ username: 'student', password: 'student123' })} className="py-2 px-2 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-400 text-xs font-medium hover:bg-gray-700 hover:text-white hover:border-blue-500/50 transition-all duration-200">
                    STUDENT
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

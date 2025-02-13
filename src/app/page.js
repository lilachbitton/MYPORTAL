"use client";
import React, { useState } from 'react';
import { auth, db } from '@/firebase/config';
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import ForgotPasswordModal from '@/components/ForgotPasswordModal';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      const userData = userDoc.data();
      
      if (!userData?.isActive) {
        throw new Error('משתמש לא פעיל');
      }
      
      if (rememberMe) {
        localStorage.setItem('email', email);
      }
      
      setLoginSuccess(true);
      
      setTimeout(() => {
        if (userCredential.user.email.toLowerCase() === 'info@business-express.co.il') {
          window.location.href = '/admin';
        } else {
          window.location.href = '/dashboard';
        }
      }, 3000);

    } catch (error) {
      if (error.message === 'משתמש לא פעיל') {
        setError('המשתמש אינו פעיל במערכת, אנא פנה למנהל המערכת');
      } else {
        setError('שם משתמש או סיסמה שגויים');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-[#0B0F17] rtl">
      <img
        src="/images/background-desktop.jpg"
        alt="רקע"
        className="hidden md:block absolute inset-0 w-full h-full object-cover object-left"
      />
      <img
        src="/images/background-mobile.jpg"
        alt="רקע"
        className="block md:hidden absolute inset-0 w-full h-full object-cover"
      />
      <div className="relative z-10 flex justify-end items-center min-h-screen p-8">
        <div className="w-full max-w-md bg-gray-900/90 text-white border border-gray-700 rounded-lg p-8">
          <div className="mb-8 text-center">
            <img 
              src="/images/logo.png"
              alt="ביזנס אקספרס"
              className="h-16 mx-auto mb-4"
            />
            <h2 className="text-xl text-gray-300">כניסה</h2>
          </div>

          {loginSuccess && (
            <div className="mb-4 p-3 bg-green-500/20 text-green-500 rounded-md text-center">
              התחברת בהצלחה, אתה מועבר לקורס...
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 text-red-500 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="email"
                placeholder="דואר אלקטרוני"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-[#ff4b1f] transition-colors text-right"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="סיסמא"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-[#ff4b1f] transition-colors text-right"
                required
              />
            </div>
            <div className="flex items-center gap-2 flex-row-reverse">
              <label htmlFor="remember" className="text-sm text-gray-400">
                זכור אותי
              </label>
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-gray-700 bg-gray-800/50 text-[#ff4b1f]"
              />
            </div>
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full px-4 py-2 bg-[#ff4b1f] hover:bg-[#ff3000] text-white rounded-md transition-colors font-medium disabled:opacity-50"
            >
              {isLoading ? 'מתחבר...' : 'כניסה'}
            </button>
            <div className="space-y-2 text-center">
              <div>
                <a href="/register" className="text-sm text-gray-400 hover:text-white">
                  אין לך כבר חשבון? הירשם כאן
                </a>
              </div>
              <div>
                <button 
                  type="button" 
                  onClick={() => setShowForgotModal(true)} 
                  className="text-sm text-gray-400 hover:text-white"
                >
                  שכחת סיסמא? לחץ כאן
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      {showForgotModal && (
        <ForgotPasswordModal
          isOpen={showForgotModal}
          onClose={() => setShowForgotModal(false)}
        />
      )}
    </div>
  );
};

export default LoginPage;
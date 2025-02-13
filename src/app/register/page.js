"use client";
import React, { useState } from 'react';
import { auth, db } from '@/firebase/config';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // בדיקת התאמה של הסיסמאות
    if (formData.password !== formData.confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // יצירת המשתמש ב-Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // שמירת הנתונים ב-Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        isActive: true,
        createdAt: new Date().toISOString()
      });

      console.log('נרשם בהצלחה:', userCredential.user);

      // קריאה ל-API לשליחת המייל
      const response = await fetch('/api/sendEmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: formData.email,
          subject: 'הרשמה בוצעה בהצלחה',
          text: `שלום,
          
הרשמתך בוצעה בהצלחה!
שם המשתמש שלך: ${formData.email}
כניסה למערכת: https://login-portal-peach.vercel.app/`,
          username: formData.email
        }),
      });
      const data = await response.json();
      console.log('תשובת API של המייל:', data);

      // הצגת הודעת הצלחה והפניה לדף הכניסה לאחר 3 שניות
      setRegistrationSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);

    } catch (error) {
      console.error("Error during registration:", error);
      setError('שגיאה בהרשמה: ' + (error.message || 'אנא נסה שוב מאוחר יותר'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen relative bg-[#0B0F17] rtl">
      {/* רקע לדסקטופ */}
      <img
        src="/images/background-desktop.jpg"
        alt="ביזנס אקספרס"
        className="hidden md:block absolute inset-0 w-full h-full object-cover object-left"
      />
      {/* רקע למובייל */}
      <img
        src="/images/background-mobile.jpg"
        alt="ביזנס אקספרס"
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
            <h2 className="text-xl text-gray-300">הרשמה לתכנית המעשית - עסק טיטניום</h2>
          </div>
          {registrationSuccess && (
            <div className="mb-4 p-3 bg-green-500/20 text-green-500 rounded-md text-center">
              נרשמת בהצלחה! המייל נשלח אליך, מעבירים אותך לעמוד הכניסה...
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
                type="text"
                name="fullName"
                placeholder="שם מלא"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-[#ff4b1f] transition-colors text-right"
                required
              />
            </div>
            <div>
              <input
                type="email"
                name="email"
                placeholder="דואר אלקטרוני"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-[#ff4b1f] transition-colors text-right"
                required
              />
            </div>
            <div>
              <input
                type="tel"
                name="phone"
                placeholder="טלפון נייד"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-[#ff4b1f] transition-colors text-right"
                required
              />
            </div>
            <div>
              <input
                type="password"
                name="password"
                placeholder="סיסמא"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-[#ff4b1f] transition-colors text-right"
                required
              />
            </div>
            <div>
              <input
                type="password"
                name="confirmPassword"
                placeholder="אימות סיסמא"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-[#ff4b1f] transition-colors text-right"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full px-4 py-2 bg-[#ff4b1f] hover:bg-[#ff3000] text-white rounded-md transition-colors font-medium disabled:opacity-50"
            >
              {isLoading ? 'נרשם...' : 'הרשמה'}
            </button>
            <div className="text-center">
              <a href="/" className="text-sm text-gray-400 hover:text-white">
                יש לך כבר חשבון? התחבר כאן
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
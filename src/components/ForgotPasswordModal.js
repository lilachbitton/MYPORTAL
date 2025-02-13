// src/components/ForgotPasswordModal.js
import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/firebase/config';

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('מייל לאיפוס סיסמא נשלח, אנא בדוק/י את תיבת הדואר שלך.');
    } catch (err) {
      setError('שגיאה: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-gray-900 p-6 rounded-lg shadow-lg w-full max-w-md text-white rtl">
        <h2 className="text-xl mb-4 text-center">איפוס סיסמא</h2>
        {message && (
          <div className="mb-4 p-2 bg-green-500 text-green-200 rounded">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 p-2 bg-red-500 text-red-200 rounded">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="דואר אלקטרוני"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-right placeholder-gray-400 focus:outline-none focus:border-[#ff4b1f]"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-[#ff4b1f] hover:bg-[#ff3000] rounded font-medium disabled:opacity-50"
          >
            {isLoading ? 'מעבד...' : 'שלח מייל לאיפוס סיסמא'}
          </button>
        </form>
        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        >
          סגור
        </button>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;

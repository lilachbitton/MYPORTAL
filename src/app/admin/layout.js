// app/admin/layout.js
import Link from 'next/link';
import React from 'react';

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-row-reverse">
      <aside className="w-64 bg-gray-800 text-white p-6">
        <h2 className="text-2xl font-bold mb-6 text-right">לוח ניהול</h2>
        <nav>
          <ul className="text-right">
            <li className="mb-4">
              <Link href="/admin">
                דף ראשי
              </Link>
            </li>
            <li className="mb-4">
              <Link href="/admin/users">
                ניהול משתמשים
              </Link>
            </li>
            <li className="mb-4">
              <Link href="/admin/content">
                ניהול תוכן
              </Link>
            </li>
            <li className="mb-4">
              <Link href="/admin/settings">
                הגדרות
              </Link>
            </li>
          </ul>
        </nav>
      </aside>
      <main className="flex-1 p-8 bg-gray-100">
        {children}
      </main>
    </div>
  );
}

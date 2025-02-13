import Link from 'next/link';
import React from 'react';

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-row-reverse">
      {/* סרגל ניווט – רשימת השיעורים */}
      <aside className="w-64 bg-gray-800 text-white p-6">
        <h2 className="text-2xl font-bold mb-6 text-right">השיעורים שלי</h2>
        <nav>
          <ul className="text-right">
            {/* כאן ניתן להכניס קישורים דינמיים לשיעורים (לדוגמא: לפי נתונים מ-Firestore) */}
            <li className="mb-4">
              <Link href="/dashboard/lessons/lesson1">
                שיעור 1
              </Link>
            </li>
            <li className="mb-4">
              <Link href="/dashboard/lessons/lesson2">
                שיעור 2
              </Link>
            </li>
            <li className="mb-4">
              <Link href="/dashboard/lessons/lesson3">
                שיעור 3
              </Link>
            </li>
          </ul>
        </nav>
      </aside>

      {/* תוכן מרכזי – דף השיעור */}
      <main className="flex-1 p-8 bg-gray-100">
        {children}
      </main>
    </div>
  );
}

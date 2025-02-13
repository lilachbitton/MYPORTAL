"use client";
import React, { useState, useEffect } from 'react';
import { auth, db } from '@/firebase/config';
import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc, 
  getDoc, 
  setDoc, 
  query, 
  orderBy 
} from "firebase/firestore";
import { 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail 
} from "firebase/auth";
import * as XLSX from 'xlsx';

const StudentManagement = () => {
  const [showModal, setShowModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [cycles, setCycles] = useState([]);
  const [newStudent, setNewStudent] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    cycle: ''
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCycles = async () => {
    try {
      const cyclesQuery = query(collection(db, "cycles"), orderBy("startDate", "desc"));
      const querySnapshot = await getDocs(cyclesQuery);
      const cyclesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
      setCycles(cyclesData);
    } catch (error) {
      console.error("Error fetching cycles:", error);
      alert('אירעה שגיאה בטעינת המחזורים');
    }
  };

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
      alert('אירעה שגיאה בטעינת המשתמשים');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchCycles();
  }, []);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSuccess(false);
    setIsLoading(true);
    
    try {
      // בדיקת תקינות הקלט
      if (!newStudent.fullName || !newStudent.email || !newStudent.phone || !newStudent.password) {
        throw new Error('נא למלא את כל השדות החובה');
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        newStudent.email, 
        newStudent.password
      );
      
      await setDoc(doc(db, "users", userCredential.user.uid), {
        fullName: newStudent.fullName,
        email: newStudent.email,
        phone: newStudent.phone,
        cycle: newStudent.cycle,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const response = await fetch('/api/sendEmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: newStudent.email,
          subject: 'פרטי התחברות למערכת',
          text: `שלום,
          
הרשמתך בוצעה בהצלחה!
שם המשתמש שלך: ${newStudent.email}
כניסה למערכת: https://login-portal-peach.vercel.app/`,
          username: newStudent.email
        }),
      });

      if (!response.ok) {
        throw new Error('שגיאה בשליחת המייל');
      }

      setIsSuccess(true);
      await fetchUsers();
      
      setTimeout(() => {
        setShowModal(false);
        setNewStudent({ 
          fullName: '', 
          email: '', 
          phone: '', 
          password: '',
          cycle: ''
        });
        setIsSuccess(false);
      }, 2000);
      
    } catch (err) {
      console.error("Error adding student:", err);
      setErrorMessage(
        err.code === 'auth/email-already-in-use' 
          ? 'כתובת האימייל כבר קיימת במערכת' 
          : err.message || 'אירעה שגיאה בהוספת התלמיד'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserCycle = async (userId, cycleId) => {
    if (!userId) {
      console.error("Missing userId");
      alert('שגיאה: חסר מזהה משתמש');
      return;
    }

    setIsLoading(true);
    try {
      // בדיקה האם המשתמש קיים
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        alert('המשתמש לא נמצא במערכת');
        return;
      }

      // עדכון המחזור
      await updateDoc(userRef, {
        cycle: cycleId,
        updatedAt: new Date().toISOString()
      });

      // המתנה קצרה לפני רענון הנתונים
      setTimeout(async () => {
        await fetchUsers();
        // הודעת הצלחה
        const cycleName = cycles.find(c => c.id === cycleId)?.name || 'ללא מחזור';
        alert(`המחזור עודכן בהצלחה ל${cycleName}`);
      }, 500);

    } catch (error) {
      console.error("Error updating user cycle:", error);
      alert('אירעה שגיאה בעדכון המחזור');
    } finally {
      setIsLoading(false);
    }
  };

  const sortBy = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortedUsers = () => {
    const filteredUsers = users.filter(user => 
      user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!sortConfig.key) return filteredUsers;

    return [...filteredUsers].sort((a, b) => {
      if (a[sortConfig.key] === b[sortConfig.key]) return 0;
      if (sortConfig.direction === 'ascending') {
        return a[sortConfig.key] > b[sortConfig.key] ? 1 : -1;
      }
      return a[sortConfig.key] < b[sortConfig.key] ? 1 : -1;
    });
  };

  const exportToExcel = () => {
    const exportData = getSortedUsers().map(user => ({
      'שם מלא': user.fullName,
      'אימייל': user.email,
      'טלפון': user.phone,
      'מחזור': cycles.find(c => c.id === user.cycle)?.name || 'ללא מחזור',
      'סטטוס': user.isActive ? 'פעיל' : 'לא פעיל',
      'תאריך הרשמה': new Date(user.createdAt).toLocaleDateString('he-IL'),
      'תאריך עדכון אחרון': user.updatedAt ? new Date(user.updatedAt).toLocaleDateString('he-IL') : ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData, { origin: 'A1' });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    XLSX.writeFile(wb, "users.xlsx");
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    if (!window.confirm(
      currentStatus 
        ? 'האם אתה בטוח שברצונך להשבית את המשתמש?' 
        : 'האם אתה בטוח שברצונך להפעיל את המשתמש?'
    )) {
      return;
    }

    setIsLoading(true);
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        isActive: !currentStatus,
        cycle: !currentStatus ? null : (await getDoc(userRef)).data()?.cycle,
        updatedAt: new Date().toISOString()
      });
      await fetchUsers();
    } catch (error) {
      console.error("Error updating user status:", error);
      alert('אירעה שגיאה בעדכון סטטוס המשתמש');
    } finally {
      setIsLoading(false);
    }
  };

  const sendResetPassword = async (email) => {
    if (!window.confirm('האם אתה בטוח שברצונך לשלוח מייל לאיפוס סיסמה?')) {
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      alert('נשלח מייל לאיפוס סיסמה');
    } catch (error) {
      console.error("Error sending reset email:", error);
      alert('אירעה שגיאה בשליחת המייל');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4" dir="rtl">
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      <button 
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4"
        disabled={isLoading}
      >
        הוסף תלמיד ידנית
      </button>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-700 bg-opacity-50 z-50">
          <div className="bg-white rounded p-6 w-full max-w-md">
            <h2 className="text-xl mb-4 text-center font-bold">הוספת תלמיד חדש</h2>

            {isSuccess && (
              <div className="mb-4 p-3 bg-green-100 text-green-600 rounded text-center">
                תלמיד נוסף בהצלחה!
              </div>
            )}

            {errorMessage && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleAddStudent}>
              <div className="mb-4">
                <label className="block mb-1 font-medium">שם מלא:</label>
                <input
                  type="text"
                  value={newStudent.fullName}
                  onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
                  required
                  className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>

              <div className="mb-4">
                <label className="block mb-1 font-medium">דואר אלקטרוני:</label>
                <input
                  type="email"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  required
                  className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>

              <div className="mb-4">
                <label className="block mb-1 font-medium">טלפון:</label>
                <input
                  type="tel"
                  value={newStudent.phone}
                  onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                  required
                  className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>

              <div className="mb-4">
                <label className="block mb-1 font-medium">מחזור:</label>
                <select
                  value={newStudent.cycle}
                  onChange={(e) => setNewStudent({ ...newStudent, cycle: e.target.value })}
                  className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  <option value="">ללא מחזור</option>
                  {cycles.map(cycle => (
                    <option key={cycle.id} value={cycle.id}>
                      {cycle.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block mb-1 font-medium">סיסמא:</label>
                <input
                  type="password"
                  value={newStudent.password}
                  onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                  required
                  className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>

              <div className="flex justify-end space-x-2">
             <button 
                  type="submit"
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 ml-2"
                  disabled={isLoading || isSuccess}
                >
                  הוסף תלמיד
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setNewStudent({ 
                      fullName: '', 
                      email: '', 
                      phone: '', 
                      password: '',
                      cycle: ''
                    });
                    setErrorMessage('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  disabled={isLoading}
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="חיפוש לפי שם או אימייל..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-64 px-4 py-2 border rounded-md"
          disabled={isLoading}
        />
        <button
          onClick={exportToExcel}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          disabled={isLoading}
        >
          ייצוא לאקסל
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border-collapse border">
          <thead>
            <tr className="bg-gray-100">
              <th 
                className="border p-2 cursor-pointer hover:bg-gray-200"
                onClick={() => sortBy('fullName')}
              >
                שם מלא {sortConfig.key === 'fullName' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
              </th>
              <th 
                className="border p-2 cursor-pointer hover:bg-gray-200"
                onClick={() => sortBy('email')}
              >
                אימייל {sortConfig.key === 'email' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
              </th>
              <th 
                className="border p-2 cursor-pointer hover:bg-gray-200"
                onClick={() => sortBy('phone')}
              >
                טלפון {sortConfig.key === 'phone' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
              </th>
              <th 
                className="border p-2 cursor-pointer hover:bg-gray-200"
                onClick={() => sortBy('cycle')}
              >
                מחזור {sortConfig.key === 'cycle' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
              </th>
              <th 
                className="border p-2 cursor-pointer hover:bg-gray-200"
                onClick={() => sortBy('isActive')}
              >
                סטטוס {sortConfig.key === 'isActive' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
              </th>
              <th className="border p-2">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {getSortedUsers().map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="border p-2">{user.fullName}</td>
                <td className="border p-2">{user.email}</td>
                <td className="border p-2">{user.phone}</td>
                <td className="border p-2">
                  <select
                    value={user.cycle || ''}
                    onChange={(e) => {
                      const newCycleId = e.target.value;
                      if (window.confirm('האם את בטוחה שברצונך לשנות את המחזור?')) {
                        updateUserCycle(user.id, newCycleId);
                      }
                    }}
                    className="w-full p-1 border rounded"
                    disabled={!user.isActive || isLoading}
                  >
                    <option value="">ללא מחזור</option>
                    {cycles.map(cycle => (
                      <option key={cycle.id} value={cycle.id}>
                        {cycle.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border p-2">
                  <span className={`px-2 py-1 rounded ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {user.isActive ? 'פעיל' : 'לא פעיל'}
                  </span>
                </td>
                <td className="border p-2">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => sendResetPassword(user.email)}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 ml-2"
                      disabled={isLoading}
                    >
                      שחזור סיסמה
                    </button>
                    <button
                      onClick={() => toggleUserStatus(user.id, user.isActive)}
                      className={`px-3 py-1 rounded ${
                        user.isActive 
                          ? 'bg-red-500 text-white hover:bg-red-600' 
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                      disabled={isLoading}
                    >
                      {user.isActive ? 'השבת' : 'הפעל'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentManagement;
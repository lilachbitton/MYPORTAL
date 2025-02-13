"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/firebase/config';
import { collection, getDocs, addDoc, query, orderBy } from "firebase/firestore";

const CyclesPage = () => {
  const [cycles, setCycles] = useState([]);
  const [newCycle, setNewCycle] = useState({
    name: '',
    startDate: '',
    description: ''
  });
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchCycles();
  }, []);

  const fetchCycles = async () => {
    try {
      const cyclesQuery = query(collection(db, "cycles"), orderBy("startDate", "desc"));
      const querySnapshot = await getDocs(cyclesQuery);
      const cyclesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCycles(cyclesData);
    } catch (error) {
      console.error("שגיאה בטעינת מחזורים:", error);
    }
  };

  const handleAddCycle = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "cycles"), {
        name: newCycle.name,
        startDate: newCycle.startDate,
        description: newCycle.description,
        createdAt: new Date().toISOString()
      });

      setNewCycle({ name: '', startDate: '', description: '' });
      setShowModal(false);
      fetchCycles();
    } catch (error) {
      console.error("שגיאה בהוספת מחזור:", error);
    }
  };

  return (
    <div className="p-4" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">ניהול מחזורים</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          פתיחת מחזור חדש
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">פתיחת מחזור חדש</h2>
            <form onSubmit={handleAddCycle}>
              <div className="mb-4">
                <label className="block mb-1">שם המחזור:</label>
                <input
                  type="text"
                  value={newCycle.name}
                  onChange={(e) => setNewCycle({ ...newCycle, name: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block mb-1">תאריך התחלה:</label>
                <input
                  type="date"
                  value={newCycle.startDate}
                  onChange={(e) => setNewCycle({ ...newCycle, startDate: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block mb-1">תיאור:</label>
                <textarea
                  value={newCycle.description}
                  onChange={(e) => setNewCycle({ ...newCycle, description: e.target.value })}
                  className="w-full p-2 border rounded"
                  rows="3"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 ml-2"
                >
                  צור מחזור
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cycles.map(cycle => (
          <div key={cycle.id} className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-xl font-bold mb-2">{cycle.name}</h2>
            <p className="text-gray-600 mb-2">
              תאריך התחלה: {new Date(cycle.startDate).toLocaleDateString('he-IL')}
            </p>
            <p className="text-gray-600 mb-4">{cycle.description}</p>
            <Link 
              href={`/admin/cycles/${cycle.id}`}
              className="block w-full text-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              ניהול שיעורים
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CyclesPage;
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { db, auth } from "@/firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";

const DashboardPage = () => {
  const [lessons, setLessons] = useState([]);
  
  // נניח שיש לך דרך לקבל את מחזור התלמיד, או שאתה מגדיר מזהה קבוע לבדיקות
  const studentCycleId = "demoCycleId"; // עדכן בהתאם

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const lessonsQuery = query(
          collection(db, "lessons"),
          where("cycleId", "==", studentCycleId)
        );
        const querySnapshot = await getDocs(lessonsQuery);
        const lessonsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setLessons(lessonsData);
      } catch (error) {
        console.error("שגיאה בטעינת השיעורים:", error);
      }
    };
    fetchLessons();
  }, [studentCycleId]);

  return (
    <div className="p-8" dir="rtl">
      <h1 className="text-3xl font-bold mb-6 text-right">לוח תלמיד</h1>
      {lessons.length === 0 ? (
        <p>אין שיעורים זמינים כרגע.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {lessons.map((lesson) => (
            <Link key={lesson.id} href={`/dashboard/lessons/${lesson.id}`}>
              <a className="block p-4 bg-white rounded shadow">
                <h2 className="text-xl font-bold">{lesson.title}</h2>
                <p>{new Date(lesson.date).toLocaleDateString("he-IL")}</p>
              </a>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;

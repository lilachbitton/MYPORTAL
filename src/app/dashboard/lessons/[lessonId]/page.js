"use client";
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/firebase/config';
import { 
  collection, 
  doc, 
  getDoc, 
  updateDoc,
  query,
  where,
  getDocs
} from "firebase/firestore";
import SimpleEditor from '@/components/SimpleEditor';

const StudentLessonPage = () => {
  const params = useParams();
  const { lessonId } = params;
  
  const [lesson, setLesson] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentId, setStudentId] = useState(null); // בהמשך נחליף את זה עם מערכת אותנטיקציה
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  useEffect(() => {
    // כרגע נשתמש ב-ID קבוע לצורך הדגמה
    setStudentId("eGjUZxKRfWTgViqjzpODAki1okA2");
  }, []);

  useEffect(() => {
    if (lessonId && studentId) {
      fetchLessonAndAssignment();
    }
  }, [lessonId, studentId]);

  const fetchLessonAndAssignment = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // קבלת פרטי השיעור
      const lessonDoc = await getDoc(doc(db, "lessons", lessonId));
      if (!lessonDoc.exists()) {
        throw new Error('השיעור לא נמצא');
      }
      const lessonData = { id: lessonDoc.id, ...lessonDoc.data() };
      setLesson(lessonData);

      // קבלת המטלה של התלמיד
      const assignmentsQuery = query(
        collection(db, "assignments"),
        where("lessonId", "==", lessonId),
        where("studentId", "==", studentId)
      );
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      
      if (!assignmentsSnapshot.empty) {
        const assignmentData = {
          id: assignmentsSnapshot.docs[0].id,
          ...assignmentsSnapshot.docs[0].data()
        };
        setAssignment(assignmentData);
      }

    } catch (error) {
      console.error("שגיאה בטעינת פרטי השיעור:", error);
      setError('שגיאה בטעינת פרטי השיעור');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContent = async (newContent) => {
    try {
      if (!assignment?.id) return;

      await updateDoc(doc(db, "assignments", assignment.id), {
        'content.studentContent': newContent,
        status: 'draft',
        updatedAt: new Date().toISOString()
      });

      setSuccessMessage('התוכן נשמר בהצלחה');
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 3000);

    } catch (error) {
      console.error("שגיאה בשמירת התוכן:", error);
      setError('שגיאה בשמירת התוכן');
    }
  };

  const handleSubmitAssignment = async () => {
    try {
      if (!assignment?.id) return;

      await updateDoc(doc(db, "assignments", assignment.id), {
        status: 'submitted',
        updatedAt: new Date().toISOString()
      });

      setSuccessMessage('המטלה הוגשה בהצלחה');
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 3000);
      
      // רענון הנתונים
      await fetchLessonAndAssignment();

    } catch (error) {
      console.error("שגיאה בהגשת המטלה:", error);
      setError('שגיאה בהגשת המטלה');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!lesson) {
    return <div className="p-4 text-center">לא נמצא שיעור</div>;
  }

  const isSubmitted = assignment?.status === 'submitted' || 
                     assignment?.status === 'review' || 
                     assignment?.status === 'completed';

  return (
    <div className="p-4" dir="rtl">
      {showSuccessAlert && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50">
          {successMessage}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{lesson.title}</h1>
        <p className="text-gray-600">
          תאריך: {new Date(lesson.date).toLocaleDateString('he-IL')}
        </p>
      </div>

      {lesson.zoomLink && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">הקלטת השיעור:</h2>
          <a 
            href={lesson.zoomLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            צפה בהקלטה
          </a>
        </div>
      )}

      {lesson.presentationLink && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">מצגת השיעור:</h2>
          <a 
            href={lesson.presentationLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            צפה במצגת
          </a>
        </div>
      )}

      {lesson.materials?.length > 0 && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">חומרי עזר:</h2>
          <div className="space-y-2">
            {lesson.materials.map((material, index) => (
              <a 
                key={index}
                href={material.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-blue-500 hover:underline"
              >
                {material.title}
              </a>
            ))}
          </div>
        </div>
      )}

      {assignment && (
        <div className="mt-8">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">המטלה שלך</h2>
              
              <div className="mb-4">
                <p className="text-gray-600">סטטוס: {
                  {
                    'pending': 'טרם הוגש',
                    'draft': 'טיוטה',
                    'submitted': 'הוגש',
                    'review': 'בבדיקה',
                    'completed': 'הושלם',
                    'revision': 'נדרש תיקון'
                  }[assignment.status] || assignment.status
                }</p>
                {assignment.dueDate && (
                  <p className="text-gray-600">
                    תאריך הגשה: {new Date(assignment.dueDate).toLocaleDateString('he-IL')}
                  </p>
                )}
              </div>

              {assignment.content?.template && (
                <div className="mb-6">
                  <h3 className="font-bold mb-2">המשימה:</h3>
                  <div className="bg-gray-50 p-4 rounded border max-h-60 overflow-y-auto">
                    <SimpleEditor
                      content={assignment.content.template}
                      readOnly={true}
                    />
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-bold mb-2">התשובה שלך:</h3>
                <div className="bg-white border rounded">
                  <SimpleEditor
                    content={assignment.content?.studentContent || ''}
                    readOnly={isSubmitted}
                    onChange={handleSaveContent}
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                {!isSubmitted && (
                  <button
                    onClick={handleSubmitAssignment}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    הגש מטלה
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentLessonPage;
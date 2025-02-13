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
  const [studentId, setStudentId] = useState("eGjUZxKRfWTgViqjzpODAki1okA2");
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (lessonId && studentId) {
      fetchLessonAndAssignment();
    }
  }, [lessonId, studentId]);

  const fetchLessonAndAssignment = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const lessonDoc = await getDoc(doc(db, "lessons", lessonId));
      if (!lessonDoc.exists()) {
        throw new Error('השיעור לא נמצא');
      }
      const lessonData = { id: lessonDoc.id, ...lessonDoc.data() };
      setLesson(lessonData);

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

      setSuccessMessage('המטלה נשלחה לבדיקה');
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 3000);
      
      setAssignment(prev => ({
        ...prev,
        status: 'submitted'
      }));

    } catch (error) {
      console.error("שגיאה בהגשת המטלה:", error);
      setError('שגיאה בהגשת המטלה');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
      case 'submitted': return 'bg-blue-100 text-blue-800 border border-blue-300';
      case 'review': return 'bg-purple-100 text-purple-800 border border-purple-300';
      case 'completed': return 'bg-orange-100 text-orange-800 border border-orange-300';
      case 'revision': return 'bg-orange-100 text-orange-800 border border-orange-300';
      case 'resubmitted': return 'bg-blue-100 text-blue-800 border border-blue-300';
      default: return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
    }
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'pending': return 'חדש';
      case 'submitted': return 'הוגש לבדיקה';
      case 'review': return 'בבדיקה';
      case 'completed': return 'לאחר משוב';
      case 'revision': return 'לאחר משוב';
      case 'resubmitted': return 'נשלח לבדיקה מחדש';
      default: return 'חדש';
    }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen flex items-center justify-center">
        <div className="bg-white border border-red-300 text-red-700 px-6 py-4 rounded-xl shadow-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!lesson) {
    return <div className="p-4 text-center">לא נמצא שיעור</div>;
  }

  const isSubmitted = ['submitted', 'review', 'completed', 'revision', 'resubmitted'].includes(assignment?.status);

  return (
    <div className="min-h-screen rtl bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      {showSuccessAlert && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg z-50 shadow-lg">
          {successMessage}
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-8">
        {/* כותרת השיעור */}
        <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 border-b pb-4 border-orange-500 text-center">
            {lesson.title}
          </h1>
          <p className="text-gray-600 text-center">
            {new Date(lesson.date).toLocaleDateString('he-IL')}
          </p>
        </div>

        {/* הקלטת השיעור */}
        {lesson.zoomLink && (
          <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300 p-8">
            <h2 className="text-2xl font-semibold mb-6 text-right border-b pb-4 border-orange-500">
              הקלטת השיעור
            </h2>
            <div className="aspect-w-16 aspect-h-9 rounded-xl overflow-hidden">
              <iframe
                src={lesson.zoomLink?.includes('vimeo') 
                  ? `${lesson.zoomLink}?autoplay=0&title=0&byline=0&portrait=0` 
                  : lesson.zoomLink?.includes('youtu') 
                    ? `https://www.youtube.com/embed/${lesson.zoomLink.split('v=')[1]}`
                    : lesson.zoomLink}
                className="w-full h-96 rounded-xl"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                frameBorder="0"
                title="שיעור מוקלט"
              />
            </div>
          </div>
        )}

        {/* מצגת השיעור */}
        {lesson.presentationLink && (
          <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300 p-8">
            <h2 className="text-2xl font-semibold mb-6 text-right border-b pb-4 border-orange-500">
              מצגת השיעור
            </h2>
            <div className="flex justify-center">
              <a
                href={lesson.presentationLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1"
              >
                צפה במצגת
              </a>
            </div>
          </div>
        )}

        {/* חומרי עזר */}
        {lesson.materials?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300 p-8">
            <h2 className="text-2xl font-semibold mb-6 text-right border-b pb-4 border-orange-500">
              חומרי עזר
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {lesson.materials.map((material, index) => (
                <a
                  key={index}
                  href={material.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block p-6 bg-gray-50 rounded-xl hover:bg-orange-50 transition-all duration-300 text-right shadow hover:shadow-md transform hover:-translate-y-1"
                >
                  <span className="text-lg font-medium text-gray-900 group-hover:text-orange-600">
                    {material.title}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* המשימה */}
        {assignment && (
          <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300 p-8">
            <div className="flex flex-row-reverse justify-between items-center border-b pb-6 mb-6 border-orange-500">
              <div className="text-right">
                <h2 className="text-2xl font-bold mb-2">המשימה שלך</h2>
                {assignment.dueDate && (
                  <p className="text-gray-600">
                    יש להגיש עד: {new Date(assignment.dueDate).toLocaleDateString('he-IL')}
                  </p>
                )}
              </div>
              <div className={`px-6 py-3 rounded-full text-sm font-semibold ${getStatusColor(assignment.status)}`}>
                {getStatusText(assignment.status)}
              </div>
            </div>

            <div dir="rtl" style={{ direction: 'rtl' }}>
              <SimpleEditor
                content={assignment.content?.studentContent || assignment.content?.template || ''}
                onChange={handleSaveContent}
                readOnly={isSubmitted}
                style={{
                  direction: 'rtl',
                  textAlign: 'right',
                  minHeight: '300px',
                }}
                className="bg-gray-50 rounded-xl p-6 shadow-inner"
              />
            </div>

            {!isSubmitted && (
              <div className="mt-8 flex justify-start">
                <button
                  onClick={handleSubmitAssignment}
                  className="px-8 py-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1 font-semibold"
                >
                  הגש לבדיקה
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentLessonPage;
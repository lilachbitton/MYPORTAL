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
import { 
  BookOpenIcon, 
  ClockIcon, 
  DocumentCheckIcon, 
  FileTextIcon 
} from 'lucide-react';

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
        status: 'pending_review',
        updatedAt: new Date().toISOString()
      });

      setSuccessMessage('המטלה נשלחה לבדיקה');
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 3000);
      
      await fetchLessonAndAssignment();

    } catch (error) {
      console.error("שגיאה בהגשת המטלה:", error);
      setError('שגיאה בהגשת המטלה');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'pending_review': return 'bg-blue-100 text-blue-800';
      case 'review': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'revision': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-orange-500 to-red-600">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center bg-gradient-to-br from-orange-500 to-red-600 min-h-screen">
        <div className="bg-white border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!lesson) {
    return <div className="p-4 text-center">לא נמצא שיעור</div>;
  }

  const isSubmitted = ['pending_review', 'review', 'completed'].includes(assignment?.status);

  return (
    <div className="min-h-screen rtl bg-gradient-to-br from-orange-500 to-red-600 p-4 md:p-8">
      {showSuccessAlert && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50 shadow-lg">
          {successMessage}
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        {/* כותרת השיעור וסטטוס */}
        <div className="bg-white rounded-xl shadow-2xl p-6 mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-red-600"></div>
          <div className="flex justify-between items-start">
            <div className="w-full text-right">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <BookOpenIcon className="ml-3 text-orange-600 shadow-md" size={32} />
                  {lesson.title}
                </h1>
                {assignment && (
                  <div className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(assignment.status)}`}>
                    {assignment.status === 'draft' && 'טיוטה'}
                    {assignment.status === 'pending_review' && 'ממתין לבדיקה'}
                    {assignment.status === 'review' && 'בבדיקה'}
                    {assignment.status === 'completed' && 'הושלם'}
                    {assignment.status === 'revision' && 'נדרש תיקון'}
                  </div>
                )}
              </div>
              <p className="text-gray-600 mt-2 flex items-center justify-start">
                <ClockIcon className="ml-3 text-orange-500 shadow-md" size={20} />
                {new Date(lesson.date).toLocaleDateString('he-IL')}
              </p>
            </div>
          </div>
        </div>

        {/* הקלטת השיעור */}
        {lesson.zoomLink && (
          <div className="bg-white rounded-xl shadow-2xl p-6 mb-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-red-600"></div>
            <h2 className="text-xl font-semibold mb-4 text-right flex items-center">
              <FileTextIcon className="ml-3 text-orange-600 shadow-md" size={24} />
              הקלטת השיעור
            </h2>
            <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden shadow-lg">
              <iframe
                src={lesson.zoomLink}
                className="w-full h-96"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        )}

        {/* חומרי עזר */}
        {lesson.materials?.length > 0 && (
          <div className="bg-white rounded-xl shadow-2xl p-6 mb-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-red-600"></div>
            <h2 className="text-xl font-semibold mb-4 text-right flex items-center">
              <FileTextIcon className="ml-3 text-orange-600 shadow-md" size={24} />
              חומרי עזר
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lesson.materials.map((material, index) => (
                <a
                  key={index}
                  href={material.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-orange-50 transition-all duration-300 text-right shadow-md hover:shadow-xl"
                >
                  <span className="text-lg font-medium text-gray-900 mr-auto">{material.title}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* המשימה */}
        {assignment && (
          <div className="bg-white rounded-xl shadow-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-red-600"></div>
            <div className="border-b pb-4 mb-6 text-right">
              <h2 className="text-2xl font-bold flex items-center">
                <DocumentCheckIcon className="ml-3 text-orange-600 shadow-md" size={28} />
                המשימה שלך
              </h2>
              {assignment.dueDate && (
                <p className="text-gray-600 mt-2 flex items-center">
                  <ClockIcon className="ml-3 text-orange-500 shadow-md" size={20} />
                  יש להגיש עד: {new Date(assignment.dueDate).toLocaleDateString('he-IL')}
                </p>
              )}
            </div>

            <div className="prose max-w-none text-right">
              <SimpleEditor
                content={assignment.content?.studentContent || assignment.content?.template || ''}
                onChange={handleSaveContent}
                readOnly={isSubmitted}
                className="min-h-[300px] text-right bg-gray-50 rounded-lg p-4 shadow-inner"
              />
            </div>

            {!isSubmitted && (
              <div className="mt-6 flex justify-start">
                <button
                  onClick={handleSubmitAssignment}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center"
                >
                  <DocumentCheckIcon className="ml-3" size={20} />
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
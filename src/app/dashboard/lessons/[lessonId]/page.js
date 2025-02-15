"use client";
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  collection, 
  doc, 
  getDoc, 
  updateDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  increment
} from "firebase/firestore";
import { db } from '@/firebase/config';
import SimpleEditor from '@/components/SimpleEditor';
import ChatComponent from '@/components/ChatComponent';

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
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [editHistory, setEditHistory] = useState([]);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);

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

        // קריאת ספירת הודעות לא נקראות מתוך מסמך הצ'אט
        const chatRef = doc(db, 'chats', assignmentData.id);
        const chatDoc = await getDoc(chatRef);
        if (chatDoc.exists()) {
          const chatData = chatDoc.data();
          assignmentData.unreadMessages = chatData.unreadCount?.student || 0;
        } else {
          assignmentData.unreadMessages = 0;
        }

        setAssignment(assignmentData);
        
        setEditHistory([
          { 
            date: assignmentData.createdAt, 
            type: 'created', 
            status: 'נוצר'
          },
          ...(assignmentData.editHistory || []),
          ...(assignmentData.updatedAt !== assignmentData.createdAt ? [{
            date: assignmentData.updatedAt,
            type: 'edited',
            status: 'נערך'
          }] : [])
        ].sort((a, b) => new Date(b.date) - new Date(a.date)));
      }

    } catch (error) {
      console.error("שגיאה בטעינת פרטי השיעור:", error);
      setError('שגיאה בטעינת פרטי השיעור');
    } finally {
      setLoading(false);
    }
  };

  // מאזין לעדכון השדה unreadCount במסמך הצ'אט
  useEffect(() => {
    if (assignment?.id) {
      const chatRef = doc(db, 'chats', assignment.id);
      const unsubscribeChat = onSnapshot(chatRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const chatData = docSnapshot.data();
          setAssignment(prev => ({
            ...prev,
            unreadMessages: chatData.unreadCount?.student || 0
          }));
          console.log("Student page unreadCount updated:", chatData.unreadCount?.student);
        }
      });
      return () => {
        unsubscribeChat();
      };
    }
  }, [assignment?.id]);

  const handleSaveContent = async (newContent) => {
    try {
      if (!assignment?.id) return;

      const newHistoryEntry = {
        date: new Date().toISOString(),
        type: 'edited',
        status: 'נערך'
      };

      await updateDoc(doc(db, "assignments", assignment.id), {
        'content.studentContent': newContent,
        updatedAt: new Date().toISOString(),
        editHistory: [...(assignment.editHistory || []), newHistoryEntry]
      });

      setEditHistory(prev => [newHistoryEntry, ...prev]);
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

      let newStatus = 'submitted';
      let statusText = 'הוגש לבדיקה';
      
      if (assignment.status === 'new' || !assignment.status) {
        newStatus = 'submitted';
        statusText = 'הוגש לבדיקה';
      } else if (assignment.status === 'feedback' || assignment.status === 'needs_revision') {
        newStatus = 'resubmitted';
        statusText = 'הוגש לבדיקה חוזרת';
      }

      const newHistoryEntry = {
        date: new Date().toISOString(),
        type: 'submitted',
        status: statusText
      };

      await updateDoc(doc(db, "assignments", assignment.id), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
        editHistory: [...(assignment.editHistory || []), newHistoryEntry]
      });

      setEditHistory(prev => [newHistoryEntry, ...prev]);
      setSuccessMessage(statusText);
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 3000);
      
      setAssignment(prev => ({
        ...prev,
        status: newStatus
      }));
      setShowSubmitModal(false);

    } catch (error) {
      console.error("שגיאה בהגשת המטלה:", error);
      setError('שגיאה בהגשת המטלה');
    }
  };

  const handleCloseChatModal = async () => {
    if (assignment?.id) {
      try {
        const chatRef = doc(db, 'chats', assignment.id);
        await updateDoc(chatRef, {
          'unreadCount.student': 0
        });
        setAssignment(prev => ({
          ...prev,
          unreadMessages: 0
        }));
      } catch (error) {
        console.error("Error resetting unread count:", error);
      }
    }
    setShowChatModal(false);
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

  const isSubmitted = ['submitted', 'resubmitted', 'completed'].includes(assignment?.status);
  const isAfterFeedback = ['feedback', 'needs_revision'].includes(assignment?.status);
  const canEdit = !isSubmitted && assignment?.status !== 'completed';

  return (
    <div className="min-h-screen rtl bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      {showSuccessAlert && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg z-50 shadow-lg">
          {successMessage}
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-8">
        {/* פרטי השיעור */}
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

        {/* מודל אישור הגשה */}
        {showSubmitModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4">אישור הגשת מטלה</h3>
              <p className="mb-6 text-gray-600">
                האם אתה בטוח שברצונך להגיש את המטלה? לאחר ההגשה לא ניתן יהיה לערוך את התוכן.
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  ביטול
                </button>
                <button
                  onClick={handleSubmitAssignment}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  {isAfterFeedback ? 'אישור הגשה חוזרת' : 'אישור הגשה'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* מודל היסטוריית שינויים */}
        {historyModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">היסטוריית שינויים</h3>
                <button
                  onClick={() => setHistoryModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {editHistory.map((entry, index) => (
                  <div key={index} className="border-b pb-2">
                    <p className="font-medium">{entry.status}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(entry.date).toLocaleString('he-IL')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* מודל הצ'אט */}
        {showChatModal && assignment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-2xl mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">צ'אט עם המורה</h3>
                <button
                  onClick={handleCloseChatModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <ChatComponent
                assignmentId={assignment.id}
                currentUserId={studentId}
                userRole="student"
              />
            </div>
          </div>
        )}
      </div>

      {/* כפתור צ'אט צף */}
      {assignment && (
        <button
          onClick={() => setShowChatModal(true)}
          className="fixed bottom-8 left-8 z-40 px-6 py-3 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-semibold flex items-center gap-2"
        >
          <span>צ'אט שיעור</span>
          {assignment.unreadMessages > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {assignment.unreadMessages}
            </span>
          )}
        </button>
      )}
    </div>
  );
};

export default StudentLessonPage;

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

  // טוען את פרטי השיעור והמטלה
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

        // קריאת ספירת הודעות לא נקראות מתוך מסמך הצ׳אט
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

  // מאזין לעדכון השדה unreadCount במסמך הצ׳אט
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
        {/* כאן מוצגים פרטי השיעור, החומרים וכו' – (לא שינינו את החלק הזה) */}
        {/* ... */}
        
        {/* מודל הצ׳אט */}
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

      {/* כפתור צ׳אט צף */}
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

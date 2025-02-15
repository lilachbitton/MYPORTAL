"use client";
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  getDoc, 
  updateDoc, 
  query, 
  where,
  onSnapshot
} from "firebase/firestore";
import { db } from '@/firebase/config';
import SimpleEditor from '@/components/SimpleEditor';
import ChatComponent from '@/components/ChatComponent';
import AssignmentFeedback from '@/components/AssignmentFeedback';

const AssignmentsPage = () => {
  const params = useParams();
  const { cycleId, lessonId } = params;
  
  const [lesson, setLesson] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatListeners, setChatListeners] = useState({}); // מעקב אחרי האזנות לצ'אט

  // ניקוי האזנות בעת פירוק הקומפוננטה
  useEffect(() => {
    return () => {
      Object.values(chatListeners).forEach(unsubscribe => unsubscribe());
    };
  }, [chatListeners]);

  useEffect(() => {
    if (lessonId && cycleId) {
      fetchLessonDetails();
    }
  }, [lessonId, cycleId]);

  // פונקציה להאזנה לעדכוני הצ'אט עבור מטלה מסוימת
  const setupChatListener = (assignmentId) => {
    if (chatListeners[assignmentId]) return;

    const chatRef = doc(db, 'chats', assignmentId);
    const unsubscribe = onSnapshot(chatRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const chatData = docSnapshot.data();
        setAssignments(prev =>
          prev.map(assignment =>
            assignment.id === assignmentId
              ? { ...assignment, unreadMessages: chatData.unreadCount?.teacher || 0 }
              : assignment
          )
        );
      }
    });

    setChatListeners(prev => ({
      ...prev,
      [assignmentId]: unsubscribe
    }));
  };

  const fetchLessonDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const lessonDoc = await getDoc(doc(db, "lessons", lessonId));
      if (lessonDoc.exists()) {
        const lessonData = { id: lessonDoc.id, ...lessonDoc.data() };
        setLesson(lessonData);
        await fetchAssignments(lessonData);
      } else {
        throw new Error("השיעור לא נמצא");
      }
    } catch (error) {
      console.error("שגיאה בטעינת פרטי השיעור:", error);
      setError("שגיאה בטעינת פרטי השיעור");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async (lessonData) => {
    try {
      // קבלת כל התלמידים במחזור
      const studentsQuery = query(
        collection(db, "users"),
        where("cycle", "==", cycleId),
        where("isActive", "==", true)
      );
      const studentsSnapshot = await getDocs(studentsQuery);

      // קבלת כל המטלות הקיימות לשיעור
      const assignmentsQuery = query(
        collection(db, "assignments"),
        where("lessonId", "==", lessonId)
      );
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      const existingAssignments = new Map(
        assignmentsSnapshot.docs.map(doc => [doc.data().studentId, { id: doc.id, ...doc.data() }])
      );

      const assignmentsData = [];
      const assignmentCreationPromises = [];

      for (const studentDoc of studentsSnapshot.docs) {
        const student = { id: studentDoc.id, ...studentDoc.data() };
        const existingAssignment = existingAssignments.get(student.id);

        if (existingAssignment) {
          // אם קיימת מטלה לתלמיד, נוסיף אותה
          assignmentsData.push({
            ...existingAssignment,
            student,
            unreadMessages: 0 // ערך התחלתי
          });
        } else if (lessonData.assignment?.content?.template) {
          // יצירת מטלה חדשה לתלמיד
          const assignmentData = {
            lessonId,
            cycleId,
            studentId: student.id,
            title: lessonData.assignment.title || "",
            description: lessonData.assignment.description || "",
            dueDate: lessonData.assignment.dueDate || "",
            content: {
              template: lessonData.assignment.content.template,
              studentContent: ""
            },
            status: "pending",
            teacherStatus: "pending",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            unreadMessages: 0
          };

          assignmentCreationPromises.push(async () => {
            const newAssignmentRef = await addDoc(collection(db, "assignments"), assignmentData);
            assignmentsData.push({
              id: newAssignmentRef.id,
              ...assignmentData,
              student
            });
            return newAssignmentRef.id;
          });
        }
      }

      // יצירת מטלות חדשות במידה ויש
      if (assignmentCreationPromises.length > 0) {
        await Promise.all(assignmentCreationPromises.map(promise => promise()));
        setSuccessMessage(`נוצרו ${assignmentCreationPromises.length} מטלות חדשות`);
        setShowSuccessAlert(true);
        setTimeout(() => setShowSuccessAlert(false), 3000);
      }

      // הגדרת האזנה לצ'אט עבור כל מטלה
      assignmentsData.forEach(assignment => {
        setupChatListener(assignment.id);
      });

      setAssignments(assignmentsData);

    } catch (error) {
      console.error("שגיאה בטעינת מטלות:", error);
      setError("שגיאה בטעינת מטלות התלמידים");
    }
  };

  const updateAssignmentStatus = async (assignmentId, newStatus) => {
    try {
      setLoading(true);
      setError(null);

      // המרת סטטוס מצד המורה לצד התלמיד במידת הצורך
      let studentStatus = newStatus;
      if (newStatus === "completed" || newStatus === "revision") {
        studentStatus = "feedback";
      }

      await updateDoc(doc(db, "assignments", assignmentId), {
        status: studentStatus,
        teacherStatus: newStatus,
        updatedAt: new Date().toISOString()
      });

      const assignment = assignments.find(a => a.id === assignmentId);

      // שליחת מייל לתלמיד בהתאם לסטטוס החדש
      if (assignment?.student?.email) {
        let emailSubject = "";
        let emailText = "";

        switch (newStatus) {
          case "completed":
            emailSubject = "המטלה שלך נבדקה ואושרה";
            emailText = `שלום ${assignment.student.fullName},\n\nהמטלה שהגשת בשיעור "${lesson?.title}" נבדקה ואושרה.\nכל הכבוד!`;
            break;
          case "revision":
            emailSubject = "נדרשים תיקונים במטלה שהגשת";
            emailText = `שלום ${assignment.student.fullName},\n\nהמטלה שהגשת בשיעור "${lesson?.title}" נבדקה ונדרשים מספר תיקונים.\nאנא בדוק/י את ההערות במסמך ובצע/י את התיקונים הנדרשים.`;
            break;
          case "review":
            emailSubject = "המטלה שלך התקבלה ונמצאת בבדיקה";
            emailText = `שלום ${assignment.student.fullName},\n\nהמטלה שהגשת בשיעור "${lesson?.title}" התקבלה ונמצאת בבדיקה.\nניצור איתך קשר בהקדם.`;
            break;
          default:
            break;
        }

        if (emailSubject && emailText) {
          await fetch("/api/sendEmail", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: assignment.student.email,
              subject: emailSubject,
              text: emailText,
              username: assignment.student.email
            }),
          });
        }
      }

      setSuccessMessage("סטטוס המטלה עודכן בהצלחה");
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 3000);

      await fetchLessonDetails();
    } catch (error) {
      console.error("שגיאה בעדכון סטטוס המטלה:", error);
      setError("שגיאה בעדכון סטטוס המטלה");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status, teacherStatus) => {
    if (status === 'feedback') {
      return teacherStatus === 'completed'
        ? 'px-2 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800'
        : 'px-2 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800';
    }
    const classes = {
      "pending": "bg-gray-100 text-gray-800",
      "submitted": "bg-yellow-100 text-yellow-800",
      "review": "bg-blue-100 text-blue-800",
      "completed": "bg-green-100 text-green-800",
      "revision": "bg-red-100 text-red-800"
    };
    return `px-2 py-1 rounded-full text-sm font-medium ${classes[status] || classes.pending}`;
  };

  const getStatusText = (status, teacherStatus) => {
    if (status === 'feedback') {
      return teacherStatus === 'completed' ? 'הושלם' : 'נדרש תיקון';
    }
    const texts = {
      "pending": "טרם הוגש",
      "submitted": "ממתין לבדיקה",
      "review": "בבדיקה",
      "completed": "הושלם",
      "revision": "נדרש תיקון"
    };
    return texts[status] || "טרם הוגש";
  };

  const sortBy = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getSortedAssignments = () => {
    const filtered = assignments.filter(assignment => 
      assignment.student?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.student?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!sortConfig.key) return filtered;

    return [...filtered].sort((a, b) => {
      let aValue = a.student?.[sortConfig.key] || "";
      let bValue = b.student?.[sortConfig.key] || "";
      
      if (sortConfig.key === "status") {
        aValue = a[sortConfig.key] || "";
        bValue = b[sortConfig.key] || "";
      }

      if (sortConfig.direction === "ascending") {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });
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

  return (
    <div className="p-4" dir="rtl">
      {showSuccessAlert && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50">
          {successMessage}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{lesson.title}</h1>
        <p className="text-gray-600">ניהול מטלות תלמידים</p>
        {lesson.assignment?.title && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold">פרטי המטלה:</h2>
            <p className="text-gray-800 mt-1">{lesson.assignment.title}</p>
            {lesson.assignment.description && (
              <p className="text-gray-600 mt-2">{lesson.assignment.description}</p>
            )}
            {lesson.assignment.dueDate && (
              <p className="text-gray-600 mt-2">
                תאריך הגשה: {new Date(lesson.assignment.dueDate).toLocaleDateString("he-IL")}
              </p>
            )}
            {lesson.assignment.content?.template && (
              <div className="mt-4">
                <h3 className="text-md font-semibold mb-2">תוכן המטלה:</h3>
                <div className="bg-white p-4 rounded border max-h-40 overflow-y-auto">
                  <SimpleEditor
                    content={lesson.assignment.content.template}
                    readOnly={true}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-4 flex justify-between items-center">
        <input
          type="text"
          placeholder="חיפוש לפי שם תלמיד או אימייל..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-64 px-4 py-2 border rounded-md"
        />
        <div className="text-gray-600">
          סה"כ תלמידים: {assignments.length}
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => sortBy('fullName')}
              >
                שם התלמיד 
                {sortConfig.key === 'fullName' && (sortConfig.direction === 'ascending' ? ' ↑' : ' ↓')}
              </th>
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => sortBy('email')}
              >
                אימייל
                {sortConfig.key === 'email' && (sortConfig.direction === 'ascending' ? ' ↑' : ' ↓')}
              </th>
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => sortBy('status')}
              >
                סטטוס
                {sortConfig.key === 'status' && (sortConfig.direction === 'ascending' ? ' ↑' : ' ↓')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                תאריך עדכון
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                פעולות
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {getSortedAssignments().map(assignment => (
              <tr key={assignment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {assignment.student?.fullName}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {assignment.student?.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={assignment.teacherStatus || assignment.status}
                    onChange={(e) => updateAssignmentStatus(assignment.id, e.target.value)}
                    className={`${getStatusBadgeClass(assignment.status, assignment.teacherStatus)} border-0 cursor-pointer w-full`}
                    disabled={loading}
                  >
                    <option value="pending">טרם הוגש</option>
                    <option value="submitted">ממתין לבדיקה</option>
                    <option value="review">בבדיקה</option>
                    <option value="completed">הושלם</option>
                    <option value="revision">נדרש תיקון</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {assignment.updatedAt ? new Date(assignment.updatedAt).toLocaleDateString('he-IL') : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                  <div className="flex space-x-2 justify-end relative">
                    {assignment.content?.studentContent && (
                      <button
                        onClick={() => {
                          setSelectedAssignment(assignment);
                          setShowResponseModal(true);
                        }}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:border-blue-700 focus:shadow-outline-blue active:bg-blue-800 transition duration-150 ease-in-out ml-2"
                      >
                        צפה בתשובה
                      </button>
                    )}
                    
                    <button
                      onClick={() => {
                        setSelectedAssignment(assignment);
                        setShowChatModal(true);
                      }}
                      className="relative inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:border-purple-700 focus:shadow-outline-purple active:bg-purple-800 transition duration-150 ease-in-out"
                      disabled={loading}
                    >
                      צ'אט
                      {assignment.unreadMessages > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {assignment.unreadMessages}
                        </span>
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {assignments.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          לא נמצאו תלמידים במחזור זה
        </div>
      )}

      {/* מודל להצגת תשובת התלמיד עם ההערות */}
      {showResponseModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                תשובת התלמיד: {selectedAssignment.student?.fullName}
              </h2>
              <button
                onClick={() => {
                  setShowResponseModal(false);
                  setSelectedAssignment(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <AssignmentFeedback
                studentContent={selectedAssignment.content.studentContent}
                feedbacks={selectedAssignment.feedbacks || []}
                onSaveFeedback={async (updatedFeedbacks) => {
                  try {
                    await updateDoc(doc(db, "assignments", selectedAssignment.id), {
                      feedbacks: updatedFeedbacks,
                      updatedAt: new Date().toISOString()
                    });
                    
                    setSuccessMessage('ההערות נשמרו בהצלחה');
                    setShowSuccessAlert(true);
                    setTimeout(() => setShowSuccessAlert(false), 3000);
                  } catch (error) {
                    console.error("שגיאה בשמירת ההערות:", error);
                    setError('שגיאה בשמירת ההערות');
                  }
                }}
                onUpdateStatus={(newStatus) => updateAssignmentStatus(selectedAssignment.id, newStatus)}
              />
            </div>
          </div>
        </div>
      )}

      {/* מודל הצ'אט */}
      {showChatModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">צ'אט עם {selectedAssignment.student?.fullName}</h3>
              <button
                onClick={() => {
                  setShowChatModal(false);
                  setSelectedAssignment(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <ChatComponent
              assignmentId={selectedAssignment.id}
              currentUserId="admin"
              userRole="teacher"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentsPage;

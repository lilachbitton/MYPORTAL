"use client";
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/firebase/config';
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  getDoc, 
  updateDoc, 
  query, 
  where 
} from "firebase/firestore";
import { duplicateGoogleDoc, shareDocument } from '@/services/googleDriveService';

const AssignmentsPage = () => {
  const params = useParams();
  const { cycleId, lessonId } = params;
  
  const [lesson, setLesson] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (lessonId && cycleId) {
      fetchLessonDetails();
    }
  }, [lessonId, cycleId]);

  const fetchLessonDetails = async () => {
    try {
      const lessonDoc = await getDoc(doc(db, "lessons", lessonId));
      if (lessonDoc.exists()) {
        setLesson({ id: lessonDoc.id, ...lessonDoc.data() });
        await fetchAssignments(lessonDoc.data());
      } else {
        throw new Error('השיעור לא נמצא');
      }
    } catch (error) {
      console.error("שגיאה בטעינת פרטי השיעור:", error);
      alert('שגיאה בטעינת פרטי השיעור');
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

      // קבלת כל המטלות הקיימות
      const assignmentsQuery = query(
        collection(db, "assignments"),
        where("lessonId", "==", lessonId)
      );
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      const existingAssignments = new Map(
        assignmentsSnapshot.docs.map(doc => [doc.data().studentId, { id: doc.id, ...doc.data() }])
      );

      // יצירת או עדכון מטלות לכל התלמידים
      const assignmentsData = [];
      for (const studentDoc of studentsSnapshot.docs) {
        const student = { id: studentDoc.id, ...studentDoc.data() };
        const existingAssignment = existingAssignments.get(student.id);

        if (existingAssignment) {
          assignmentsData.push({
            ...existingAssignment,
            student
          });
        } else if (lessonData.assignment?.templateDocUrl) {
          // יצירת מטלה חדשה לתלמיד
          const assignmentData = {
            lessonId,
            cycleId,
            studentId: student.id,
            title: lessonData.assignment.title || '',
            description: lessonData.assignment.description || '',
            dueDate: lessonData.assignment.dueDate || '',
            templateDocUrl: lessonData.assignment.templateDocUrl || '',
            status: 'pending',
            createdAt: new Date().toISOString()
          };

          const newAssignmentRef = await addDoc(collection(db, "assignments"), assignmentData);
          assignmentsData.push({
            id: newAssignmentRef.id,
            ...assignmentData,
            student
          });
        }
      }

      setAssignments(assignmentsData);
    } catch (error) {
      console.error("שגיאה בטעינת מטלות:", error);
      alert('שגיאה בטעינת מטלות התלמידים');
    }
  };

  const createAssignmentForStudent = async (assignment, student) => {
    try {
      setLoading(true);
      const templateUrl = lesson.assignment.templateDocUrl;
      const fileId = templateUrl.match(/[-\w]{25,}/)[0];
      
      const newFileId = await duplicateGoogleDoc(
        fileId,
        `${lesson.assignment.title} - ${student.fullName}`
      );
      
      await shareDocument(newFileId, student.email);
      
      const newDocUrl = `https://docs.google.com/document/d/${newFileId}/edit`;
      
      await updateDoc(doc(db, "assignments", assignment.id), {
        studentDocUrl: newDocUrl,
        status: 'pending',
        updatedAt: new Date().toISOString()
      });

      // שליחת מייל לתלמיד
      await fetch('/api/sendEmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: student.email,
          subject: 'מטלה חדשה זמינה',
          text: `שלום ${student.fullName},\n\nמטלה חדשה בשיעור "${lesson.title}" זמינה עבורך.\nקישור למטלה: ${newDocUrl}`,
          username: student.email
        }),
      });

      setSuccessMessage('המטלה נוצרה בהצלחה ונשלחה לתלמיד');
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 3000);

      await fetchLessonDetails();
    } catch (error) {
      console.error('Error creating assignment:', error);
      alert('שגיאה ביצירת המטלה');
    } finally {
      setLoading(false);
    }
  };

  const updateAssignmentStatus = async (assignmentId, newStatus) => {
    try {
      setLoading(true);
      await updateDoc(doc(db, "assignments", assignmentId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      
      if (newStatus === 'completed') {
        const assignment = assignments.find(a => a.id === assignmentId);
        if (assignment?.student?.email) {
          await fetch('/api/sendEmail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: assignment.student.email,
              subject: 'המטלה שלך נבדקה',
              text: `שלום ${assignment.student.fullName},\n\nהמטלה שהגשת בשיעור "${lesson?.title}" נבדקה.\nאנא היכנס/י למערכת לצפייה בהערות המנטור.`,
              username: assignment.student.email
            }),
          });
        }
      }

      setSuccessMessage('סטטוס המטלה עודכן בהצלחה');
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 3000);

      await fetchLessonDetails();
    } catch (error) {
      console.error("שגיאה בעדכון סטטוס המטלה:", error);
      alert('שגיאה בעדכון סטטוס המטלה');
    } finally {
      setLoading(false);
    }
  };

const getStatusBadgeClass = (status) => {
    const classes = {
      'pending': 'bg-gray-100 text-gray-800',
      'submitted': 'bg-yellow-100 text-yellow-800',
      'review': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'revision': 'bg-red-100 text-red-800'
    };
    return `px-2 py-1 rounded-full text-sm font-medium ${classes[status] || classes.pending}`;
  };

  const getStatusText = (status) => {
    const texts = {
      'pending': 'טרם הוגש',
      'submitted': 'ממתין לבדיקה',
      'review': 'בבדיקה',
      'completed': 'הושלם',
      'revision': 'הוגש לבדיקה מחדש'
    };
    return texts[status] || 'טרם הוגש';
  };

  const sortBy = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
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
      let aValue = a.student?.[sortConfig.key] || '';
      let bValue = b.student?.[sortConfig.key] || '';
      
      if (sortConfig.key === 'status') {
        aValue = a[sortConfig.key] || '';
        bValue = b[sortConfig.key] || '';
      }

      if (sortConfig.direction === 'ascending') {
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
          <div className="mt-2">
            <h2 className="text-lg font-semibold">פרטי המטלה:</h2>
            <p>{lesson.assignment.title}</p>
            {lesson.assignment.description && (
              <p className="text-gray-600 mt-1">{lesson.assignment.description}</p>
            )}
            {lesson.assignment.dueDate && (
              <p className="text-gray-600">
                תאריך הגשה: {new Date(lesson.assignment.dueDate).toLocaleDateString('he-IL')}
              </p>
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
                {sortConfig.key === 'status' && (sortConfig.direction === 'ascending' ?' ↑' : ' ↓')}
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
                  <div className="text-sm text-gray-900">
                    {assignment.student?.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={assignment.status}
                    onChange={(e) => updateAssignmentStatus(assignment.id, e.target.value)}
                    className={`${getStatusBadgeClass(assignment.status)} border-0 cursor-pointer`}
                    disabled={loading}
                  >
                    <option value="pending">טרם הוגש</option>
                    <option value="submitted">ממתין לבדיקה</option>
                    <option value="review">בבדיקה</option>
                    <option value="completed">הושלם</option>
                    <option value="revision">הוגש לבדיקה מחדש</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {assignment.updatedAt ? new Date(assignment.updatedAt).toLocaleDateString('he-IL') : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                  <div className="flex space-x-2 justify-end">
                    {!assignment.studentDocUrl && lesson.assignment?.templateDocUrl ? (
                      <button
                        onClick={() => createAssignmentForStudent(assignment, assignment.student)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:border-green-700 focus:shadow-outline-green active:bg-green-800 transition duration-150 ease-in-out ml-2"
                        disabled={loading}
                      >
                        צור מסמך
                      </button>
                    ) : (
                      assignment.studentDocUrl && (
                        <a
                          href={assignment.studentDocUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:border-blue-700 focus:shadow-outline-blue active:bg-blue-800 transition duration-150 ease-in-out ml-2"
                        >
                          פתח מסמך
                        </a>
                      )
                    )}
                    <button
                      onClick={() => window.location.href = `/admin/cycles/${cycleId}/lessons/${lessonId}/assignments/${assignment.id}/chat`}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:border-purple-700 focus:shadow-outline-purple active:bg-purple-800 transition duration-150 ease-in-out"
                      disabled={loading}
                    >
                      צ'אט
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
    </div>
  );
};

export default AssignmentsPage;
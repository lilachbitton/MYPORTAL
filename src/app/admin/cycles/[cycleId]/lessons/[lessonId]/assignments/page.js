"use client";
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/firebase/config';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, query, where } from "firebase/firestore";
import { duplicateGoogleDoc, shareDocument } from '@/services/googleDriveService';

const AssignmentsPage = () => {
  const params = useParams();
  const { cycleId, lessonId } = params;
  
  const [lesson, setLesson] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

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
      }
    } catch (error) {
      console.error("שגיאה בטעינת פרטי השיעור:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async (lessonData) => {
    try {
      // קבלת כל התלמידים במחזור
      const studentsQuery = query(
        collection(db, "users"),
        where("cycleId", "==", cycleId),
        where("role", "==", "student")
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
    }
  };

  const createAssignmentForStudent = async (assignment, student) => {
    try {
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

      fetchLessonDetails();
    } catch (error) {
      console.error('Error creating assignment:', error);
      alert('שגיאה ביצירת המטלה');
    }
  };

  const updateAssignmentStatus = async (assignmentId, newStatus) => {
    try {
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

      fetchLessonDetails();
    } catch (error) {
      console.error("שגיאה בעדכון סטטוס המטלה:", error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-gray-100 text-gray-800',
      'submitted': 'bg-yellow-100 text-yellow-800',
      'review': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'revision': 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.pending;
  };

  const getStatusText = (status) => {
    const texts = {
      'pending': 'ממתין להגשה',
      'submitted': 'הוגש',
      'review': 'בבדיקה',
      'completed': 'הושלם',
      'revision': 'דורש תיקונים'
    };
    return texts[status] || 'ממתין להגשה';
  };

  if (loading) {
    return <div className="p-4">טוען...</div>;
  }

  if (!lesson) {
    return <div className="p-4">לא נמצא שיעור</div>;
  }

  const filteredAssignments = assignments.filter(assignment => 
    assignment.student?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assignment.student?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{lesson.title}</h1>
        <p className="text-gray-600">ניהול מטלות תלמידים</p>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="חיפוש לפי שם תלמיד או אימייל..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md p-2 border rounded-md"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAssignments.map(assignment => (
          <div key={assignment.id} className="bg-white rounded-lg shadow-lg p-4">
            <div className="mb-4">
              <h2 className="text-xl font-bold">{assignment.student?.fullName}</h2>
              <p className="text-gray-600">{assignment.student?.email}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">סטטוס:</label>
              <select
                value={assignment.status}
                onChange={(e) => updateAssignmentStatus(assignment.id, e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="pending">ממתין להגשה</option>
                <option value="submitted">הוגש</option>
                <option value="review">בבדיקה</option>
                <option value="completed">הושלם</option>
                <option value="revision">דורש תיקונים</option>
              </select>
            </div>

            <div className="mb-4">
              <span className={`inline-block px-2 py-1 rounded ${getStatusColor(assignment.status)}`}>
                {getStatusText(assignment.status)}
              </span>
            </div>

            <div className="space-y-2">
              {!assignment.studentDocUrl && lesson.assignment?.templateDocUrl && (
                <button
                  onClick={() => createAssignmentForStudent(assignment, assignment.student)}
                  className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  צור מסמך מטלה
                </button>
              )}
              {assignment.studentDocUrl && (
                <a
                  href={assignment.studentDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-4 py-2 text-center bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  פתח מסמך מטלה
                </a>
              )}
              <button
                onClick={() => window.location.href = `/admin/cycles/${cycleId}/lessons/${lessonId}/assignments/${assignment.id}/chat`}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                צ'אט עם התלמיד
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssignmentsPage;
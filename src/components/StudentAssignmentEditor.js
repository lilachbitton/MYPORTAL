// components/StudentAssignmentEditor.js
"use client";
import React, { useState, useEffect } from 'react';
import RichTextEditor from './RichTextEditor';
import { db } from '@/firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const StudentAssignmentEditor = ({ assignmentId }) => {
  const [assignment, setAssignment] = useState(null);
  const [studentContent, setStudentContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'assignments', assignmentId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setAssignment(data);
          setStudentContent(data.studentContent || '');
        }
      } catch (error) {
        console.error("Error fetching assignment:", error);
      }
    };
    fetchAssignment();
  }, [assignmentId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'assignments', assignmentId), {
        studentContent,
        updatedAt: new Date().toISOString()
      });
      alert('תשובתך נשמרה בהצלחה!');
    } catch (error) {
      console.error("Error saving student assignment:", error);
      alert('אירעה שגיאה בשמירת התשובה');
    } finally {
      setIsSaving(false);
    }
  };

  if (!assignment) return <div>טוען...</div>;

  return (
    <div className="p-4" dir="rtl">
      <h2 className="text-2xl font-bold mb-4">{assignment.title}</h2>
      <div className="mb-4">
        <label className="block mb-1">תשובתך:</label>
        <RichTextEditor value={studentContent} onChange={setStudentContent} />
      </div>
      <button
        onClick={handleSave}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        disabled={isSaving}
      >
        {isSaving ? 'שומר...' : 'שמור תשובה'}
      </button>
    </div>
  );
};

export default StudentAssignmentEditor;

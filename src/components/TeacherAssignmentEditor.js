// components/TeacherAssignmentEditor.js
"use client";
import React, { useState } from 'react';
import RichTextEditor from './RichTextEditor';
import { db } from '@/firebase/config';
import { updateDoc, doc, addDoc, collection } from 'firebase/firestore';
import { duplicateAssignmentForCycle } from '@/services/assignmentService';

const TeacherAssignmentEditor = ({ lessonId, cycleId, existingAssignment, onSaved }) => {
  const [title, setTitle] = useState(existingAssignment?.title || '');
  const [content, setContent] = useState(existingAssignment?.content || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title || !content) {
      alert("יש למלא גם כותרת וגם תוכן");
      return;
    }
    setIsSaving(true);
    try {
      const assignmentData = {
        title,
        content,
        updatedAt: new Date().toISOString()
      };

      if (existingAssignment && existingAssignment.id) {
        // עדכון מטלה קיימת (נניח שהיא שמורה כחלק ממסמך השיעור)
        await updateDoc(doc(db, 'lessons', lessonId), assignmentData);
      } else {
        // שמירת המטלה במסמכי השיעור – אפשר לשמור גם ב־collection נפרד
        await addDoc(collection(db, 'lessons'), {
          ...assignmentData,
          cycleId,
          createdAt: new Date().toISOString()
        });
      }

      // לאחר השמירה, מבצעים שכפול (יצירת מטלה אישית לכל תלמיד)
      const count = await duplicateAssignmentForCycle(lessonId, cycleId, {
        title,
        content
      });
      alert(`המשימה נשמרה והועתקה ל־${count} תלמידים`);
      onSaved && onSaved();
    } catch (error) {
      console.error("Error saving assignment:", error);
      alert('אירעה שגיאה בשמירת המשימה');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4" dir="rtl">
      <div className="mb-4">
        <label className="block mb-1">כותרת המשימה:</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="הכנס כותרת"
          disabled={isSaving}
        />
      </div>
      <div className="mb-4">
        <label className="block mb-1">תוכן המשימה:</label>
        <RichTextEditor value={content} onChange={setContent} />
      </div>
      <button
        onClick={handleSave}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        disabled={isSaving}
      >
        {isSaving ? 'שומר...' : 'שמור והפץ משימה'}
      </button>
    </div>
  );
};

export default TeacherAssignmentEditor;

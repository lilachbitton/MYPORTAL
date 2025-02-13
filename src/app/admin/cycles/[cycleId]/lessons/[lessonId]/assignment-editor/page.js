// src/app/admin/cycles/[cycleId]/lessons/[lessonId]/assignment-editor/page.js
"use client";
import React from 'react';
import { useParams } from 'next/navigation';
import TeacherAssignmentEditor from '@/components/TeacherAssignmentEditor';

const AssignmentEditorPage = () => {
  const { cycleId, lessonId } = useParams();

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">עריכת משימה</h1>
      <TeacherAssignmentEditor
        lessonId={lessonId}
        cycleId={cycleId}
        onSaved={() => {
          // ניתן להוסיף ניווט או עדכון נוסף לאחר שמירה
        }}
      />
    </div>
  );
};

export default AssignmentEditorPage;

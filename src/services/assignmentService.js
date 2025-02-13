// services/assignmentService.js
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { db } from '@/firebase/config';

export const duplicateAssignmentForCycle = async (lessonId, cycleId, assignmentData) => {
  try {
    // שליפת כל התלמידים במחזור
    const studentsQuery = query(
      collection(db, 'users'),
      where('cycle', '==', cycleId),
      where('isActive', '==', true)
    );
    const studentsSnapshot = await getDocs(studentsQuery);
    const creationPromises = [];

    studentsSnapshot.forEach((studentDoc) => {
      const studentAssignment = {
        ...assignmentData,
        lessonId,
        cycleId,
        studentId: studentDoc.id,
        studentContent: '', // התחלתית ריקה
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      creationPromises.push(addDoc(collection(db, 'assignments'), studentAssignment));
    });

    await Promise.all(creationPromises);
    return creationPromises.length;
  } catch (error) {
    console.error("Error duplicating assignment:", error);
    throw error;
  }
};

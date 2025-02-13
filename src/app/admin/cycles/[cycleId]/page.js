"use client";
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/firebase/config';
import { collection, getDocs, addDoc, updateDoc, query, orderBy, doc, getDoc, where } from "firebase/firestore";
import { uploadFile } from '@/services/fileService';

const CycleLessonsPage = () => {
  const params = useParams();
  const cycleId = params.cycleId;
  
  const [cycle, setCycle] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [uploadingPresentation, setUploadingPresentation] = useState(false);
  const [presentationFile, setPresentationFile] = useState(null);
  const [materialFiles, setMaterialFiles] = useState({});
  const [newLesson, setNewLesson] = useState({
    title: '',
    date: '',
    zoomLink: '',
    presentationLink: '',
    materials: [],
    assignment: {
      title: '',
      description: '',
      dueDate: '',
      templateDocUrl: ''
    }
  });

  useEffect(() => {
    if (cycleId) {
      fetchCycleDetails();
      fetchLessons();
    }
  }, [cycleId]);

  const fetchCycleDetails = async () => {
    try {
      const cycleDoc = await getDoc(doc(db, "cycles", cycleId));
      if (cycleDoc.exists()) {
        setCycle({ id: cycleDoc.id, ...cycleDoc.data() });
      }
    } catch (error) {
      console.error("שגיאה בטעינת פרטי המחזור:", error);
    }
  };

  const fetchLessons = async () => {
    try {
      const lessonsQuery = query(
        collection(db, "lessons"),
        where("cycleId", "==", cycleId),
        orderBy("date", "asc")
      );
      const querySnapshot = await getDocs(lessonsQuery);
      const lessonsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLessons(lessonsData);
    } catch (error) {
      console.error("שגיאה בטעינת שיעורים:", error);
    }
  };

  const handleSaveLesson = async (e) => {
    e.preventDefault();
    try {
      const lessonData = {
        title: newLesson.title,
        date: newLesson.date,
        cycleId,
        zoomLink: newLesson.zoomLink || '',
        presentationLink: newLesson.presentationLink || '',
        materials: newLesson.materials,
        assignment: {
          title: newLesson.assignment.title || '',
          description: newLesson.assignment.description || '',
          dueDate: newLesson.assignment.dueDate || '',
          templateDocUrl: newLesson.assignment.templateDocUrl || ''
        },
        updatedAt: new Date().toISOString()
      };

      if (!editingLessonId) {
        lessonData.createdAt = new Date().toISOString();
        await addDoc(collection(db, "lessons"), lessonData);
      } else {
        await updateDoc(doc(db, "lessons", editingLessonId), lessonData);
      }

      setNewLesson({
        title: '',
        date: '',
        zoomLink: '',
        presentationLink: '',
        materials: [],
        assignment: {
          title: '',
          description: '',
          dueDate: '',
          templateDocUrl: ''
        }
      });
      setPresentationFile(null);
      setMaterialFiles({});
      setEditingLessonId(null);
      setShowModal(false);
      fetchLessons();
    } catch (error) {
      console.error("שגיאה בשמירת שיעור:", error);
      alert("שגיאה בשמירת השיעור");
    }
  };

  if (!cycle) {
    return <div>טוען...</div>;
  }
return (
    <div className="p-4" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{cycle.name}</h1>
          <p className="text-gray-600">ניהול שיעורים</p>
        </div>
        <button 
          onClick={() => {
            setNewLesson({
              title: '',
              date: '',
              zoomLink: '',
              presentationLink: '',
              materials: [],
              assignment: {
                title: '',
                description: '',
                dueDate: '',
                templateDocUrl: ''
              }
            });
            setPresentationFile(null);
            setMaterialFiles({});
            setEditingLessonId(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          הוספת שיעור חדש
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingLessonId ? 'עריכת שיעור' : 'הוספת שיעור חדש'}
            </h2>
            <form onSubmit={handleSaveLesson}>
              {/* Main Lesson Details */}
              <div className="mb-4">
                <label className="block mb-1">כותרת השיעור:</label>
                <input
                  type="text"
                  value={newLesson.title}
                  onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block mb-1">תאריך השיעור:</label>
                <input
                  type="date"
                  value={newLesson.date}
                  onChange={(e) => setNewLesson({ ...newLesson, date: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block mb-1">קישור להקלטת זום:</label>
                <input
                  type="url"
                  value={newLesson.zoomLink}
                  onChange={(e) => setNewLesson({ ...newLesson, zoomLink: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="https://..."
                />
              </div>

              {/* Presentation Upload */}
              <div className="mb-4">
                <label className="block mb-1">מצגת השיעור:</label>
                <div className="flex gap-4">
                  <input
                    type="url"
                    value={newLesson.presentationLink}
                    onChange={(e) => setNewLesson({ ...newLesson, presentationLink: e.target.value })}
                    className="flex-1 p-2 border rounded"
                    placeholder="קישור למצגת..."
                  />
                  <div className="relative">
                    <input
                      type="file"
                      onChange={async (e) => {
                        try {
                          const file = e.target.files[0];
                          if (!file) return;
                          
                          setUploadingPresentation(true);
                          const result = await uploadFile(file, cycleId, editingLessonId || 'new', 'presentations');
                          setNewLesson({ ...newLesson, presentationLink: result });
                          setPresentationFile(file.name);
                        } catch (error) {
                          console.error('Error uploading presentation:', error);
                          alert('שגיאה בהעלאת הקובץ');
                        } finally {
                          setUploadingPresentation(false);
                        }
                      }}
                      accept=".pdf,.ppt,.pptx"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={uploadingPresentation}
                    />
                    <button
                      type="button"
                      className={`px-4 py-2 ${uploadingPresentation ? 'bg-gray-400' : 'bg-gray-200 hover:bg-gray-300'} text-gray-700 rounded`}
                      disabled={uploadingPresentation}
                    >
                      {uploadingPresentation ? 'מעלה...' : 'העלאת קובץ'}
                    </button>
                  </div>
                </div>
                {presentationFile && (
                  <p className="text-sm text-green-600 mt-1">
                    הקובץ {presentationFile} הועלה בהצלחה
                  </p>
                )}
              </div>

              {/* Materials Section */}
              <div className="mb-4">
                <label className="block mb-1">חומרי עזר:</label>
                {newLesson.materials.map((material, index) => (
                  <div key={index} className="flex gap-4 mb-2">
                    <input
                      type="text"
                      value={material.title}
                      onChange={(e) => {
                        const newMaterials = [...newLesson.materials];
                        newMaterials[index].title = e.target.value;
                        setNewLesson({ ...newLesson, materials: newMaterials });
                      }}
                      className="flex-1 p-2 border rounded"
                      placeholder="כותרת חומר העזר"
                    />
                    <input
                      type="url"
                      value={material.url}
                      onChange={(e) => {
                        const newMaterials = [...newLesson.materials];
                        newMaterials[index].url = e.target.value;
                        setNewLesson({ ...newLesson, materials: newMaterials });
                      }}
                      className="flex-1 p-2 border rounded"
                      placeholder="קישור לחומר העזר"
                    />
                    <div className="relative">
                      <input
                        type="file"
                        onChange={async (e) => {
                          try {
                            const file = e.target.files[0];
                            if (!file) return;
                            
                            const newMaterialFiles = { ...materialFiles };
                            newMaterialFiles[index] = { uploading: true };
                            setMaterialFiles(newMaterialFiles);
                            
                            const result = await uploadFile(file, cycleId, editingLessonId || 'new', 'materials');
                            const newMaterials = [...newLesson.materials];
                            newMaterials[index].url = result;
                            newMaterials[index].title = newMaterials[index].title || file.name;
                            setNewLesson({ ...newLesson, materials: newMaterials });
                            
                            newMaterialFiles[index] = { name: file.name };
                            setMaterialFiles(newMaterialFiles);
                          } catch (error) {
                            console.error('Error uploading material:', error);
                            alert('שגיאה בהעלאת הקובץ');
                            
                            const newMaterialFiles = { ...materialFiles };
                            delete newMaterialFiles[index];
                            setMaterialFiles(newMaterialFiles);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        disabled={materialFiles[index]?.uploading}
                      />
                      <button
                        type="button"
                        className={`px-4 py-2 ${materialFiles[index]?.uploading ? 'bg-gray-400' : 'bg-gray-200 hover:bg-gray-300'} text-gray-700 rounded`}
                        disabled={materialFiles[index]?.uploading}
                      >
                        {materialFiles[index]?.uploading ? 'מעלה...' : 'העלאת קובץ'}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newMaterials = newLesson.materials.filter((_, i) => i !== index);
                        setNewLesson({ ...newLesson, materials: newMaterials });
                        
                        const newMaterialFiles = { ...materialFiles };
                        delete newMaterialFiles[index];
                        setMaterialFiles(newMaterialFiles);
                      }}
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      הסר
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setNewLesson({
                      ...newLesson,
                      materials: [...newLesson.materials, { title: '', url: '' }]
                    });
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  הוסף חומר עזר +
                </button>
              </div>

              {/* Assignment Section */}
              <div className="border-t pt-4 mb-4">
                <h3 className="font-bold mb-2">פרטי המטלה (לא חובה)</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block mb-1">כותרת המטלה:</label>
                    <input
                      type="text"
                      value={newLesson.assignment.title}
                      onChange={(e) => setNewLesson({
                        ...newLesson,
                        assignment: { ...newLesson.assignment, title: e.target.value }
                      })}
                      className="w-full p-2 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block mb-1">תיאור המטלה:</label>
                    <textarea
                      value={newLesson.assignment.description}
                      onChange={(e) => setNewLesson({
                        ...newLesson,
                        assignment: { ...newLesson.assignment, description: e.target.value }
                      })}
className="w-full p-2 border rounded"
                      rows="3"
                    />
                  </div>

                  <div>
                    <label className="block mb-1">מסמך גוגל דוקס למטלה:</label>
                    <input
                      type="url"
                      value={newLesson.assignment.templateDocUrl}
                      onChange={(e) => setNewLesson({
                        ...newLesson,
                        assignment: { ...newLesson.assignment, templateDocUrl: e.target.value }
                      })}
                      className="w-full p-2 border rounded"
                      placeholder="הכנס קישור לדוקס תבנית..."
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      * יש להגדיר את הדוקס כך שכל אחד עם הקישור יכול להעתיק
                    </p>
                  </div>

                  <div>
                    <label className="block mb-1">תאריך הגשה:</label>
                    <input
                      type="date"
                      value={newLesson.assignment.dueDate}
                      onChange={(e) => setNewLesson({
                        ...newLesson,
                        assignment: { ...newLesson.assignment, dueDate: e.target.value }
                      })}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 ml-2"
                >
                  {editingLessonId ? 'שמור שינויים' : 'הוסף שיעור'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setNewLesson({
                      title: '',
                      date: '',
                      zoomLink: '',
                      presentationLink: '',
                      materials: [],
                      assignment: {
                        title: '',
                        description: '',
                        dueDate: '',
                        templateDocUrl: ''
                      }
                    });
                    setPresentationFile(null);
                    setMaterialFiles({});
                    setEditingLessonId(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lessons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lessons.map(lesson => (
          <div key={lesson.id} className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-xl font-bold mb-2">{lesson.title}</h2>
            <p className="text-gray-600 mb-4">
              תאריך: {new Date(lesson.date).toLocaleDateString('he-IL')}
            </p>
            
            <div className="space-y-2 mb-4">
              {lesson.zoomLink && (
                <a 
                  href={lesson.zoomLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-500 hover:underline"
                >
                  הקלטת השיעור
                </a>
              )}
              {lesson.presentationLink && (
                <a 
                  href={lesson.presentationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-500 hover:underline"
                >
                  מצגת השיעור
                </a>
              )}
              {lesson.materials?.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-bold mb-2">חומרי עזר:</h3>
                  {lesson.materials.map((material, index) => (
                    <a 
                      key={index}
                      href={material.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-blue-500 hover:underline mb-1"
                    >
                      {material.title}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setNewLesson({
                    title: lesson.title,
                    date: lesson.date,
                    zoomLink: lesson.zoomLink || '',
                    presentationLink: lesson.presentationLink || '',
                    materials: lesson.materials || [],
                    assignment: lesson.assignment || {
                      title: '',
                      description: '',
                      dueDate: '',
                      templateDocUrl: ''
                    }
                  });
                  setEditingLessonId(lesson.id);
                  setShowModal(true);
                }}
                className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                עריכה
              </button>
              <button
                onClick={() => window.location.href = `/admin/cycles/${cycleId}/lessons/${lesson.id}/assignments`}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                מטלות תלמידים
              </button>
              <button
                onClick={() => window.location.href = `/admin/cycles/${cycleId}/lessons/${lesson.id}/chat`}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              >
                צ'אט כללי
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CycleLessonsPage;
"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

const DummyLessonPage = () => {
  const { lessonId } = useParams();
  const [lesson, setLesson] = useState(null);

  // שימוש בנתוני דמה במקום קריאה ל-Firebase כדי להמחיש את המבנה
  useEffect(() => {
    const dummyLesson = {
      id: lessonId,
      title: `דוגמה לשיעור ${lessonId}`,
      zoomLink: "https://www.youtube.com/embed/dQw4w9WgXcQ", // קישור לדוגמה (YouTube)
      presentationLink: "https://example.com/dummy-presentation",
      materials: [
        { title: "חומר עזר 1", url: "https://example.com/material1" },
        { title: "חומר עזר 2", url: "https://example.com/material2" }
      ]
    };
    // סימולציה של טעינת נתונים – ניתן להוסיף השהייה כדי להמחיש "טוען..."
    setTimeout(() => {
      setLesson(dummyLesson);
    }, 500);
  }, [lessonId]);

  return (
    <div dir="rtl">
      {lesson ? (
        <div>
          {/* כותרת השיעור */}
          <h1 className="text-2xl font-bold mb-4">{lesson.title}</h1>
          
          {/* חלק הוידאו (הקלטת השיעור) */}
          {lesson.zoomLink && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">הקלטת השיעור</h2>
              <div className="aspect-w-16 aspect-h-9">
                <iframe
                  src={lesson.zoomLink}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-64"
                ></iframe>
              </div>
            </div>
          )}

          {/* חלק המצגת וחומרי העזר */}
          <div className="mb-6">
            {lesson.presentationLink && (
              <div className="mb-4">
                <h2 className="text-xl font-semibold mb-2">מצגת השיעור</h2>
                <a
                  href={lesson.presentationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  צפייה במצגת
                </a>
              </div>
            )}
            {lesson.materials && lesson.materials.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-2">חומרי עזר</h2>
                <ul className="list-disc list-inside">
                  {lesson.materials.map((material, index) => (
                    <li key={index}>
                      <a
                        href={material.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        {material.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* חלק המטלה */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">מטלה</h2>
            <p className="mb-2"><strong>סטטוס המטלה:</strong> חדש</p>
            <form>
              <textarea
                placeholder="הקלד את תשובתך כאן..."
                className="w-full p-2 border rounded mb-2"
              ></textarea>
              <button
                type="button"
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                הגש מטלה
              </button>
            </form>
          </div>

          {/* חלק הצ'אט */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">צ'אט</h2>
            <div className="border p-4 rounded mb-4 h-64 overflow-y-auto">
              <p>אין הודעות עדיין.</p>
            </div>
            <form className="flex">
              <input
                type="text"
                placeholder="הקלד הודעה..."
                className="flex-1 p-2 border rounded-l"
              />
              <button
                type="button"
                className="px-4 py-2 bg-blue-500 text-white rounded-r"
              >
                שלח
              </button>
            </form>
          </div>
        </div>
      ) : (
        <p>טוען שיעור...</p>
      )}
    </div>
  );
};

export default DummyLessonPage;

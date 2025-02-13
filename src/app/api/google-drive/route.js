// src/app/api/google-drive/route.js
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// יצירת אובייקט הזדהות עם Service Account
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY,
  },
  scopes: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.readonly'
  ],
});

export async function POST(request) {
  try {
    const { fileId, title, email } = await request.json();
    
    // יצירת אובייקט Drive עם ההזדהות החדשה
    const drive = google.drive({ version: 'v3', auth });
    
    console.log('Starting document copy process...', { fileId, title });

    // בדיקה שהקובץ נמצא בתיקייה המורשית
    try {
      const file = await drive.files.get({
        fileId: fileId,
        fields: 'parents'
      });

      const isInCorrectFolder = file.data.parents?.includes(process.env.TEMPLATE_FOLDER_ID);
      if (!isInCorrectFolder) {
        return NextResponse.json(
          { 
            error: 'המסמך חייב להיות בתיקיית התבניות. אנא העבירי את המסמך לתיקייה הייעודית למשימות.',
          },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('Error checking file location:', error);
      // אם לא הצלחנו לבדוק את מיקום הקובץ, נמשיך בכל זאת
    }
    
    // שכפול המסמך
    const copyResponse = await drive.files.copy({
      fileId,
      requestBody: { name: title }
    });
    
    const newFileId = copyResponse.data.id;
    console.log('Document copied successfully:', newFileId);
    
    // שיתוף המסמך
    await drive.permissions.create({
      fileId: newFileId,
      requestBody: {
        role: 'writer',
        type: 'user',
        emailAddress: email
      },
      // חשוב: לא לשלוח מייל הודעה כי אנחנו שולחים מייל משלנו
      sendNotificationEmail: false
    });
    
    console.log('Document shared successfully with:', email);
    
    return NextResponse.json({ 
      fileId: newFileId,
      url: `https://docs.google.com/document/d/${newFileId}/edit`
    });
    
  } catch (error) {
    console.error('Google Drive API error:', error);
    
    // הודעת שגיאה ידידותית למשתמש
    let userMessage = 'שגיאה בעיבוד המסמך';
    if (error.message?.includes('File not found')) {
      userMessage = 'הקובץ לא נמצא. אנא ודאי שהקישור תקין ושיש לך הרשאות גישה';
    } else if (error.message?.includes('Insufficient permissions')) {
      userMessage = 'אין מספיק הרשאות לביצוע הפעולה. אנא ודאי שהקובץ נמצא בתיקייה הנכונה';
    }

    return NextResponse.json(
      { 
        error: userMessage,
        details: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
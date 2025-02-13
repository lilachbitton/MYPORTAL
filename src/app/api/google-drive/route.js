// src/app/api/google-drive/route.js
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// הגדרת אובייקט האותנטיקציה
const auth = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  null,
  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file'
  ]
);

export async function POST(request) {
  try {
    const { fileId, title, email } = await request.json();
    
    // אתחול client של Drive API
    const drive = google.drive({ version: 'v3', auth });

    // בדיקת החיבור לפני המשך הפעולה
    try {
      await auth.authorize();
      console.log('Successfully connected to Google Drive API');
    } catch (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'שגיאת התחברות לגוגל דרייב', details: authError.message },
        { status: 401 }
      );
    }
    
    console.log('Starting document copy process...', { fileId, title });
    
    // שכפול המסמך
    let copyResponse;
    try {
      copyResponse = await drive.files.copy({
        fileId,
        requestBody: { name: title }
      });
      console.log('Copy response:', copyResponse.data);
    } catch (copyError) {
      console.error('Copy error:', copyError);
      return NextResponse.json(
        { error: 'שגיאה בשכפול המסמך', details: copyError.message },
        { status: 500 }
      );
    }
    
    const newFileId = copyResponse.data.id;
    console.log('Document copied successfully:', newFileId);
    
    // שיתוף המסמך
    try {
      await drive.permissions.create({
        fileId: newFileId,
        requestBody: {
          role: 'writer',
          type: 'user',
          emailAddress: email
        },
        sendNotificationEmail: false
      });
      console.log('Document shared successfully with:', email);
    } catch (shareError) {
      console.error('Share error:', shareError);
      // אם השיתוף נכשל, ננסה למחוק את העותק שיצרנו
      try {
        await drive.files.delete({ fileId: newFileId });
      } catch (deleteError) {
        console.error('Error deleting file after share failure:', deleteError);
      }
      return NextResponse.json(
        { error: 'שגיאה בשיתוף המסמך', details: shareError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      fileId: newFileId,
      url: `https://docs.google.com/document/d/${newFileId}/edit`
    });
    
  } catch (error) {
    console.error('Google Drive API error:', error);
    return NextResponse.json(
      { 
        error: 'שגיאה כללית',
        details: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
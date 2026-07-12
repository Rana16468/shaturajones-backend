import { getMessaging } from 'firebase-admin/messaging';
import users from '../module/user/user.model';
import '../app/config/firebase'; // Ensure Firebase is initialized

export const sendPushNotification = async (
  userId: string,
  title: string,
  body: string,
  data?: { [key: string]: string }
) => {
  try {
    const user = await users.findById(userId);
    if (!user || !user.fcmToken) {
      console.log(`Push Notification skipped: User ${userId} has no FCM token.`);
      return false;
    }

    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      token: user.fcmToken,
    };

    const response = await getMessaging().send(message);
    console.log('Successfully sent message:', response);
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
};

import QueryBuilder from "../../app/builder/QueryBuilder";
import catchError from "../../app/error/catchError";
import notifications from "./notification.model";



const findByAllUsersNotificationIntoDb = async (query: Record<string, unknown>, userId: string) => {
  try {
    const allNotificationQuery = new QueryBuilder(
      notifications
        .find({  userId})
        .select(
          "-password",
        ).populate([
          {
            path:"userId",
            select:"name photo"
          }
        ]),
      query,
    )
      .search([])
      .filter()
      .sort()
      .paginate()
      .fields();

    const all_notification = await allNotificationQuery.modelQuery;
    const meta = await allNotificationQuery.countTotal();

    return { meta, all_notification };
  } catch (error) {
      catchError(error);
  }
};

const markAsReadIntoDb = async (id: string, userId: string) => {
  try {
    const result = await notifications.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isRead: true } },
      { new: true }
    );
    return result;
  } catch (error) {
    catchError(error);
  }
};

const markAllAsReadIntoDb = async (userId: string) => {
  try {
    const result = await notifications.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } }
    );
    return result;
  } catch (error) {
    catchError(error);
  }
};

const deleteNotificationFromDb = async (id: string, userId: string) => {
  try {
    const result = await notifications.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isDelete: true } },
      { new: true }
    );
    return result;
  } catch (error) {
    catchError(error);
  }
};

const notificationServices={
    findByAllUsersNotificationIntoDb,
    markAsReadIntoDb,
    markAllAsReadIntoDb,
    deleteNotificationFromDb
};

export default notificationServices;
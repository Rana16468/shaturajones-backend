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






const notificationServices={
    findByAllUsersNotificationIntoDb
 
};

export default notificationServices;
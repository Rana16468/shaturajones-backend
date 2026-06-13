import http, { Server } from "http";
import mongoose from "mongoose";
import app from "./app";
import config from "./app/config";
import ApiError from "./app/error/ApiError";
import httpStatus from "http-status";

let server: Server;


const shutdown = async (signal: string) => {
  console.log(`${signal} received. Closing server...`);

  if (server) {
    server.close(async () => {
      try {
        await mongoose.connection.close();
        console.log("MongoDB connection closed");
        process.exit(0);
      } catch (err) {
        console.error("Error during shutdown:", err);
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }
};


async function main() {
  try {
  
    await mongoose.connect(config.database_url as string);
    console.log("✅ Database connected successfully");

    
    server = app.listen(config.port, () => {
      console.log(`🚀 Server running on http://${config.host}:${config.port}`);
    });

    // -------------------------
    // Global Error Handlers
    // -------------------------
    process.on("unhandledRejection", (reason) => {
      console.error("Unhandled Rejection:", reason);
      shutdown("Unhandled Rejection");
    });

    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception:", error);
      shutdown("Uncaught Exception");
    });

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (err: any) {
    console.error("Server startup failed:", err);

    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Server unavailable",
      err?.message || err
    );
  }
}

// -------------------------
// Start App
// -------------------------
main()
  .then(() => {
    console.log("🎉 shaturajones server is running");
  })
  .catch((err) => {
    console.error("Fatal error during startup:", err);
    process.exit(1);
  });
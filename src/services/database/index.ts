export type { DatabaseStrategy, DatabaseStrategyConstructor } from "./database.strategy";
export { DatabaseService } from "./database.service";
export { PrismaService } from "./prisma.service";
export { default as databasePlugin } from "./database.plugin";

// Singleton instance getter
export const getDatabase = () => {
  const { DatabaseService } = require("./database.service");
  return DatabaseService.getInstance();
};

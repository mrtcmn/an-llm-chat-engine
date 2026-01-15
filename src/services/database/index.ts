export { default as databasePlugin } from "./database.plugin";
export { DatabaseService } from "./database.service";
export type {
  DatabaseStrategy,
  DatabaseStrategyConstructor,
} from "./database.strategy";
export { PrismaService } from "./prisma.service";

// Singleton instance getter
export const getDatabase = () => {
  const { DatabaseService } = require("./database.service");
  return DatabaseService.getInstance();
};

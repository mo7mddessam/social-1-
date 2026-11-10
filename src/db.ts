import { Sequelize } from "sequelize";
import { config } from "./config";

export const sequelize = new Sequelize(
  config.dbName,
  config.dbUser,
  config.dbPassword,
  {
    host: config.dbHost,
    port: config.dbPort,
    dialect: "mysql",
    logging: config.nodeEnv === "development" ? false : false
  }
);

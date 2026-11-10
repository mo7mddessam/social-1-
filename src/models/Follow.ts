import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";
import { User } from "./User";

export class Follow extends Model {
  declare followerId: number;
  declare followingId: number;
}

Follow.init({
  followerId: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    references: { model: User, key: "id" },
    onDelete: "CASCADE"
  },
  followingId: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    references: { model: User, key: "id" },
    onDelete: "CASCADE"
  }
}, { sequelize, tableName: "follows", timestamps: true });

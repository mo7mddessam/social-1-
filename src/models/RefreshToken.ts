import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";
import { User } from "./User";

export class RefreshToken extends Model {
  declare id: number;
  declare userId: number;
  declare tokenHash: string;
  declare expiresAt: Date;
  declare revokedAt: Date | null;
}

RefreshToken.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  userId: {
    type: DataTypes.INTEGER.UNSIGNED, allowNull: false,
    references: { model: User, key: "id" }, onDelete: "CASCADE"
  },
  tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  revokedAt: { type: DataTypes.DATE, allowNull: true }
}, { sequelize, tableName: "refresh_tokens", timestamps: true });

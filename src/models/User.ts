import {
  DataTypes, Model, Optional
} from "sequelize";
import { sequelize } from "../db";

interface UserAttributes {
  id: number;
  name: string;
  email: string;
  passwordHash: string | null;
  isEmailVerified: boolean;
  isPrivate: boolean;
  bio: string | null;
  googleId: string | null;
}

type UserCreationAttributes = Optional<
  UserAttributes,
  "id" | "passwordHash" | "isEmailVerified" | "isPrivate" | "bio" | "googleId"
>;

export class User extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes {
  declare id: number;
  declare name: string;
  declare email: string;
  declare passwordHash: string | null;
  declare isEmailVerified: boolean;
  declare isPrivate: boolean;
  declare bio: string | null;
  declare googleId: string | null;
}

User.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(80), allowNull: false },
  email: { type: DataTypes.STRING(254), allowNull: false, unique: true, validate: { isEmail: true } },
  passwordHash: { type: DataTypes.STRING(255), allowNull: true },
  isEmailVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  isPrivate: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  bio: { type: DataTypes.STRING(300), allowNull: true },
  googleId: { type: DataTypes.STRING(255), allowNull: true, unique: true }
}, {
  sequelize,
  tableName: "users",
  timestamps: true,
  defaultScope: { attributes: { exclude: ["passwordHash"] } },
  scopes: { withPassword: { attributes: { include: ["passwordHash"] } } }
});

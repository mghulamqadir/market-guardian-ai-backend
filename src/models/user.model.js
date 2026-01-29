// src/models/user.model.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/postgres.config.js';
import { text, string, boolean, integer, date, uuid, uuidv4, dataEnum } from '../utils/dbTypes.js';
const User = sequelize.define(
  'User',
  {
    id: {
      type: uuid,
      defaultValue: uuidv4,
      primaryKey: true,
    },

    name: {
      type: string,
      allowNull: false,
      validate: { notEmpty: true },
    },

    // Store raw email for display + comms
    email: {
      type: string,
      allowNull: false,
      validate: { isEmail: true, notEmpty: true },
    },

    // ✅ Case-insensitive uniqueness at scale (unique index on email_lower)
    emailLower: {
      type: string,
      allowNull: false,
      field: 'email_lower',
    },

    role: {
      type: dataEnum('user', 'admin'),
      allowNull: false,
      defaultValue: 'user',
    },

    password: {
      type: string,
      allowNull: true,
    },

    profilePicture: {
      type: string,
      allowNull: true,
      defaultValue: null,
      field: 'profile_picture',
    },

    bio: {
      type: text,
      allowNull: false,
      defaultValue: '',
    },

    location: {
      type: string,
      allowNull: false,
      defaultValue: '',
    },

    isVerified: {
      type: boolean,
      allowNull: false,
      defaultValue: false,
      field: 'is_verified',
    },

    status: {
      type: dataEnum('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active',
    },

    description: {
      type: text,
      allowNull: true,
    },

    loginAttempts: {
      type: integer,
      allowNull: false,
      defaultValue: 0,
      field: 'login_attempts',
    },

    lastLoginAttempt: {
      type: date,
      allowNull: true,
      field: 'last_login_attempt',
    },
  },
  {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
      
      { unique: true, fields: ['email_lower'], name: 'users_email_lower_uq' },
      { fields: ['status'], name: 'users_status_idx' },
      { fields: ['role'], name: 'users_role_idx' },
    ],
    hooks: {
      beforeValidate: (user) => {
        if (user.email) {
          const cleaned = String(user.email).trim();
          user.email = cleaned;
          user.emailLower = cleaned.toLowerCase();
        }
      },
      beforeUpdate: (user) => {
        if (user.email) {
          const cleaned = String(user.email).trim();
          user.email = cleaned;
          user.emailLower = cleaned.toLowerCase();
        }
      },
    },
  }
);

User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

export default User;

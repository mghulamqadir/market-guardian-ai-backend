// src/models/session.model.js
import { sequelize } from '../config/postgres.config.js';
import { uuid, uuidv4, date, jsonb } from '../utils/dbTypes.js';

const Session = sequelize.define(
  'Session',
  {
    id: {
      type: uuid,
      defaultValue: uuidv4,
      primaryKey: true,
    },

    // nullable for anonymous demo sessions
    userId: {
      type: uuid,
      allowNull: true,
    },

    startedAt: {
      type: date,
      allowNull: false,
      defaultValue: () => new Date(),
    },

    endedAt: {
      type: date,
      allowNull: true,
    },

    // ✅ cooldown state (store last intervention timestamp)
    lastInterventionAt: {
      type: date,
      allowNull: true,
    },

    metadata: {
      type: jsonb,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    tableName: 'sessions',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id', 'started_at'], name: 'sessions_user_started_idx' },
      { fields: ['started_at'], name: 'sessions_started_idx' },
    ],
  }
);

export default Session;

import { sequelize } from '../config/postgres.config.js';
import { uuid, date, jsonb, bigInt } from '../utils/dbTypes.js';

const Event = sequelize.define(
  'Event',
  {
    id: {
      type: bigInt,
      autoIncrement: true,
      primaryKey: true,
    },

    sessionId: {
      type: uuid,
      allowNull: false,
    },

    ts: {
      type: date,
      allowNull: false,
      defaultValue: () => new Date(),
    },

    actionType: {
      type: string(80),
      allowNull: false,
    },

    meta: {
      type: jsonb,
      allowNull: false,
      defaultValue: {},
    },

    volatilityFlag: {
      type: boolean,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: 'events',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'events_session_ts_desc_idx',
        fields: ['session_id', { name: 'ts', order: 'DESC' }],
      },
      {
        name: 'events_ts_desc_idx',
        fields: [{ name: 'ts', order: 'DESC' }],
      },
      { name: 'events_action_type_idx', fields: ['action_type'] },
      { name: 'events_volatility_flag_idx', fields: ['volatility_flag'] },
    ],
  }
);

export default Event;

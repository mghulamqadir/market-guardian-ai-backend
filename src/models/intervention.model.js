import { sequelize } from '../config/postgres.config.js';
import { uuid, date, jsonb, bigInt, string, text } from '../utils/dbTypes.js';

const Intervention = sequelize.define(
  'Intervention',
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

    reason: {
      type: string(120),
      allowNull: false,
    },

    message: {
      type: text,
      allowNull: false,
    },

    // model used for intervention like gpt-5-mini
    model: {
      type: string(80),
      allowNull: true,
    },

    meta: {
      type: jsonb,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    tableName: 'interventions',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'interventions_session_ts_desc_idx',
        fields: ['session_id', { name: 'ts', order: 'DESC' }],
      },
      { name: 'interventions_ts_desc_idx', fields: [{ name: 'ts', order: 'DESC' }] },
      { name: 'interventions_reason_idx', fields: ['reason'] },
    ],
  }
);

export default Intervention;

import { sequelize } from '../config/postgres.config.js';
import { uuid, date, jsonb, bigInt, string, decimal, integer } from '../utils/dbTypes.js';

const Candle = sequelize.define(
  'Candle',
  {
    id: {
      type: bigInt,
      autoIncrement: true,
      primaryKey: true,
    },

    sessionId: {
      type: uuid,
      allowNull: false,
      field: 'session_id',
    },

    symbol: {
      type: string(30),
      allowNull: false,
    },

    timeframe: {
      type: string(10),
      allowNull: false,
    },

    openTime: {
      type: date,
      allowNull: false,
      field: 'open_time',
    },

    closeTime: {
      type: date,
      allowNull: false,
      field: 'close_time',
    },

    open: {
      type: decimal(20, 8),
      allowNull: false,
    },

    high: {
      type: decimal(20, 8),
      allowNull: false,
    },

    low: {
      type: decimal(20, 8),
      allowNull: false,
    },

    close: {
      type: decimal(20, 8),
      allowNull: false,
    },

    volume: {
      type: decimal(30, 8),
      allowNull: false,
    },

    quoteVolume: {
      type: decimal(30, 8),
      allowNull: true,
      field: 'quote_volume',
    },

    trades: {
      type: integer,
      allowNull: true,
    },

    takerBuyVolume: {
      type: decimal(30, 8),
      allowNull: true,
      field: 'taker_buy_volume',
    },

    takerBuyQuoteVolume: {
      type: decimal(30, 8),
      allowNull: true,
      field: 'taker_buy_quote_volume',
    },

    scenario: {
      type: string(30),
      allowNull: true,
    },

    meta: {
      type: jsonb,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    tableName: 'candles',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'candles_session_open_time_idx',
        fields: ['session_id', { name: 'open_time', order: 'DESC' }],
      },
      { name: 'candles_symbol_timeframe_idx', fields: ['symbol', 'timeframe'] },
      { name: 'candles_scenario_idx', fields: ['scenario'] },
    ],
  }
);

export default Candle;

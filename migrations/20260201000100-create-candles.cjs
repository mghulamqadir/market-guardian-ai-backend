'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable(
        'candles',
        {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.BIGINT,
          },
          session_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'sessions',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          symbol: {
            type: Sequelize.STRING(30),
            allowNull: false,
          },
          timeframe: {
            type: Sequelize.STRING(10),
            allowNull: false,
          },
          open_time: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          close_time: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          open: {
            type: Sequelize.DECIMAL(20, 8),
            allowNull: false,
          },
          high: {
            type: Sequelize.DECIMAL(20, 8),
            allowNull: false,
          },
          low: {
            type: Sequelize.DECIMAL(20, 8),
            allowNull: false,
          },
          close: {
            type: Sequelize.DECIMAL(20, 8),
            allowNull: false,
          },
          volume: {
            type: Sequelize.DECIMAL(30, 8),
            allowNull: false,
          },
          quote_volume: {
            type: Sequelize.DECIMAL(30, 8),
            allowNull: true,
          },
          trades: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          taker_buy_volume: {
            type: Sequelize.DECIMAL(30, 8),
            allowNull: true,
          },
          taker_buy_quote_volume: {
            type: Sequelize.DECIMAL(30, 8),
            allowNull: true,
          },
          scenario: {
            type: Sequelize.STRING(30),
            allowNull: true,
          },
          meta: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          created_at: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updated_at: {
            allowNull: false,
            type: Sequelize.DATE,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex(
        'candles',
        ['session_id', { name: 'open_time', order: 'DESC' }],
        { name: 'candles_session_open_time_idx', transaction }
      );
      await queryInterface.addIndex('candles', ['symbol', 'timeframe'], {
        name: 'candles_symbol_timeframe_idx',
        transaction,
      });
      await queryInterface.addIndex('candles', ['scenario'], {
        name: 'candles_scenario_idx',
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable('candles', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

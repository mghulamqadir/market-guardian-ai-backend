'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // --- Users ---
      await queryInterface.createTable(
        'users',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            allowNull: false,
          },
          name: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          email: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          email_lower: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          role: {
            type: Sequelize.ENUM('user', 'admin'),
            allowNull: false,
            defaultValue: 'user',
          },
          password: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          profile_picture: {
            type: Sequelize.STRING,
            allowNull: true,
            defaultValue: null,
          },
          bio: {
            type: Sequelize.TEXT,
            allowNull: false,
            defaultValue: '',
          },
          location: {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: '',
          },
          is_verified: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          status: {
            type: Sequelize.ENUM('active', 'inactive'),
            allowNull: false,
            defaultValue: 'active',
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          login_attempts: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          last_login_attempt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          deleted_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('users', ['email_lower'], {
        unique: true,
        name: 'users_email_lower_uq',
        transaction,
      });
      await queryInterface.addIndex('users', ['status'], {
        name: 'users_status_idx',
        transaction,
      });
      await queryInterface.addIndex('users', ['role'], {
        name: 'users_role_idx',
        transaction,
      });

      // --- OTPs ---
      await queryInterface.createTable(
        'otps',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            allowNull: false,
          },
          user_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          email: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          new_code: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          purpose: {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'forgotPassword',
          },
          expire_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("NOW() + INTERVAL '60 seconds'"),
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('otps', ['user_id'], {
        name: 'otps_user_id_idx',
        transaction,
      });
      await queryInterface.addIndex('otps', ['email'], {
        name: 'otps_email_idx',
        transaction,
      });
      await queryInterface.addIndex('otps', ['new_code'], {
        name: 'otps_new_code_idx',
        transaction,
      });
      await queryInterface.addIndex('otps', ['expire_at'], {
        name: 'otps_expire_at_idx',
        transaction,
      });

      // --- Sessions ---
      await queryInterface.createTable(
        'sessions',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
          },
          user_id: {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          started_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
          },
          ended_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          last_intervention_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          metadata: {
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

      await queryInterface.addIndex('sessions', ['user_id', 'started_at'], {
        name: 'sessions_user_started_idx',
        transaction,
      });
      await queryInterface.addIndex('sessions', ['started_at'], {
        name: 'sessions_started_idx',
        transaction,
      });

      // --- Events ---
      await queryInterface.createTable(
        'events',
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
          ts: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
          },
          action_type: {
            type: Sequelize.STRING(80),
            allowNull: false,
          },
          meta: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          volatility_flag: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
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
        'events',
        ['session_id', { name: 'ts', order: 'DESC' }],
        { name: 'events_session_ts_desc_idx', transaction }
      );
      await queryInterface.addIndex('events', [{ name: 'ts', order: 'DESC' }], {
        name: 'events_ts_desc_idx',
        transaction,
      });
      await queryInterface.addIndex('events', ['action_type'], {
        name: 'events_action_type_idx',
        transaction,
      });
      await queryInterface.addIndex('events', ['volatility_flag'], {
        name: 'events_volatility_flag_idx',
        transaction,
      });

      // --- Interventions ---
      await queryInterface.createTable(
        'interventions',
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
          ts: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
          },
          reason: {
            type: Sequelize.STRING(120),
            allowNull: false,
          },
          message: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          model: {
            type: Sequelize.STRING(80),
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
        'interventions',
        ['session_id', { name: 'ts', order: 'DESC' }],
        { name: 'interventions_session_ts_desc_idx', transaction }
      );
      await queryInterface.addIndex('interventions', [{ name: 'ts', order: 'DESC' }], {
        name: 'interventions_ts_desc_idx',
        transaction,
      });
      await queryInterface.addIndex('interventions', ['reason'], {
        name: 'interventions_reason_idx',
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
      await queryInterface.dropTable('interventions', { transaction });
      await queryInterface.dropTable('events', { transaction });
      await queryInterface.dropTable('sessions', { transaction });
      await queryInterface.dropTable('otps', { transaction });
      await queryInterface.dropTable('users', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role";', {
        transaction,
      });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_status";', {
        transaction,
      });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

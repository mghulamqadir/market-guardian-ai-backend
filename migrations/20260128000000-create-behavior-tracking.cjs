'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            // --- Create Sessions Table ---
            await queryInterface.createTable('sessions', {
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
            }, { transaction });

            // Sessions Indexes
            await queryInterface.addIndex('sessions', ['user_id', 'started_at'], {
                name: 'sessions_user_started_idx',
                transaction,
            });
            await queryInterface.addIndex('sessions', ['started_at'], {
                name: 'sessions_started_idx',
                transaction,
            });

            // --- Create Events Table ---
            await queryInterface.createTable('events', {
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
            }, { transaction });

            // Events Indexes
            await queryInterface.addIndex('events', ['session_id', 'ts'], {
                name: 'events_session_ts_desc_idx',
                // Note: Sequelize addIndex order option is a bit tricky in migrations for composite, 
                // usually passed as fields array objects, but raw query interface is simpler.
                // For simplicity in standard migration we'll just index the columns.
                // Fully customizing DESC order often requires literal replacement or specific dialect options.
                // We will trust standard indexing for now or use `fields` array if needed.
                transaction,
            });
            await queryInterface.addIndex('events', ['ts'], {
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

            // --- Create Interventions Table ---
            await queryInterface.createTable('interventions', {
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
            }, { transaction });

            // Interventions Indexes
            await queryInterface.addIndex('interventions', ['session_id', 'ts'], {
                name: 'interventions_session_ts_desc_idx',
                transaction,
            });
            await queryInterface.addIndex('interventions', ['ts'], {
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

    async down(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.dropTable('interventions', { transaction });
            await queryInterface.dropTable('events', { transaction });
            await queryInterface.dropTable('sessions', { transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
};

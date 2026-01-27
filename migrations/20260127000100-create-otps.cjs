'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('otps', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
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
      newCode: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      purpose: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'forgotPassword',
      },
      expireAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW() + INTERVAL '60 seconds'"),
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('otps', ['userId'], {
      name: 'otps_user_id_idx',
    });
    await queryInterface.addIndex('otps', ['email'], {
      name: 'otps_email_idx',
    });
    await queryInterface.addIndex('otps', ['newCode'], {
      name: 'otps_new_code_idx',
    });
    await queryInterface.addIndex('otps', ['expireAt'], {
      name: 'otps_expire_at_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('otps');
  },
};

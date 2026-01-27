import { DataTypes } from 'sequelize';
import { sequelize } from '../config/postgres.config.js';
import User from './user.model.js';

const Otp = sequelize.define(
    'Otp',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: User,
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isEmail: true,
                notEmpty: true,
            },
        },
        newCode: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        purpose: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'forgotPassword',
        },
        expireAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: () => new Date(Date.now() + 60 * 1000), // 60 seconds from now
        },
    },
    {
        timestamps: true,
        tableName: 'otps',
        indexes: [
            {
                fields: ['userId'],
            },
            {
                fields: ['email'],
            },
            {
                fields: ['newCode'],
            },
            {
                fields: ['expireAt'],
            },
        ],
    }
);

// Define association
Otp.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Otp, { foreignKey: 'userId', as: 'otps' });

// Note: PostgreSQL doesn't have built-in TTL like MongoDB
// We'll need to handle expired OTP cleanup either:
// 1. In application logic (check expireAt before using)
// 2. Using a scheduled job to delete expired records
// 3. Using PostgreSQL's pg_cron extension (if available)

export default Otp;

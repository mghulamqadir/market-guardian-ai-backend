import { DataTypes } from 'sequelize';
import { sequelize } from '../config/postgres.config.js';
import User from './user.model.js';
import { string, date, uuid, uuidv4 } from '../utils/dbTypes.js';

const Otp = sequelize.define(
    'Otp',
    {
        id: {
            type: uuid,
            defaultValue: uuidv4,
            primaryKey: true,
        },
        userId: {
            type: uuid,
            allowNull: false,
            field: 'user_id',
            references: {
                model: User,
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        email: {
            type: string,
            allowNull: false,
            validate: {
                isEmail: true,
                notEmpty: true,
            },
        },
        newCode: {
            type: string,
            allowNull: false,
            field: 'new_code',
        },
        purpose: {
            type: string,
            allowNull: false,
            defaultValue: 'forgotPassword',
        },
        expireAt: {
            type: date,
            allowNull: false,
            field: 'expire_at',
            defaultValue: () => new Date(Date.now() + 15 * 60 * 1000), // 900 seconds from now
        },
    },
    {
        timestamps: true,
        tableName: 'otps',
        underscored: true,
        indexes: [
            {
                fields: ['user_id'],
            },
            {
                fields: ['email'],
            },
            {
                fields: ['new_code'],
            },
            {
                fields: ['expire_at'],
            },
        ],
    }
);

export default Otp;

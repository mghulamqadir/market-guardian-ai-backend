import { DataTypes } from 'sequelize';
import { sequelize } from '../config/postgres.config.js';
import User from './user.model.js';
import { text, string, boolean, integer, date, uuid, uuidv4, dataEnum } from '../utils/dbTypes.js';

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
        },
        purpose: {
            type: string,
            allowNull: false,
            defaultValue: 'forgotPassword',
        },
        expireAt: {
            type: date,
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

export default Otp;

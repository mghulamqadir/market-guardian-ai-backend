import User from './user.model.js';
import Otp from './otp.model.js';
import Session from './session.model.js';
import Event from './event.model.js';
import Intervention from './intervention.model.js';
import Candle from './candle.model.js';

// User ↔ OTP
Otp.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
User.hasMany(Otp, { foreignKey: 'userId', as: 'otps' });

// User ↔ Session
Session.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
User.hasMany(Session, { foreignKey: 'userId', as: 'sessions' });

// Session ↔ Event
Event.belongsTo(Session, { foreignKey: 'sessionId', as: 'session', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Session.hasMany(Event, { foreignKey: 'sessionId', as: 'events' });

// Session ↔ Intervention
Intervention.belongsTo(Session, {
  foreignKey: 'sessionId',
  as: 'session',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

Session.hasMany(Intervention, { foreignKey: 'sessionId', as: 'interventions' });

// Session ↔ Candle
Candle.belongsTo(Session, { foreignKey: 'sessionId', as: 'session', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Session.hasMany(Candle, { foreignKey: 'sessionId', as: 'candles' });

export { User, Otp, Session, Event, Intervention, Candle };

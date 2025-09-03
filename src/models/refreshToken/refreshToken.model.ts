import { Schema, model, Document } from 'mongoose';

interface IRefreshToken extends Document {
  user: Schema.Types.ObjectId;
  token: string;
  refresh_token: string;
  expires_at: Date;
  createdByIp?: string;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    refresh_token: {
      type: String,
      required: true,
    },
    expires_at: {
      type: Date,
      required: true,
    },
    createdByIp: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups
refreshTokenSchema.index({ user: 1, refresh_token: 1 });
refreshTokenSchema.index({ expires_at: 1 }); // For cleanup of expired tokens

const RefreshTokenModel = model<IRefreshToken>('RefreshToken', refreshTokenSchema);

export default RefreshTokenModel;
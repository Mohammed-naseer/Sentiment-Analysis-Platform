import { Schema, model, Document, Types } from 'mongoose';

export interface IInvitation extends Document {
  email: string;
  role: 'Admin' | 'Analyst' | 'Viewer' | 'Reader';
  invitedBy: Types.ObjectId;
  token: string;
  status: 'Pending' | 'Accepted' | 'Expired';
  expiresAt: Date;
  createdAt: Date;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['Admin', 'Analyst', 'Viewer', 'Reader'],
      default: 'Analyst',
      required: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Expired'],
      default: 'Pending',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const Invitation = model<IInvitation>('Invitation', InvitationSchema);
export default Invitation;

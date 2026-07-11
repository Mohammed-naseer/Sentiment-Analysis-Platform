import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  firebaseUid: string;
  photoURL?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  role: 'Admin' | 'Analyst' | 'Viewer' | 'Reader' | 'Pending';
  approved: boolean;
  rejectionReason?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    firebaseUid: {
      type: String,
      required: [true, 'Firebase UID is required'],
      unique: true,
      index: true,
    },
    photoURL: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    role: {
      type: String,
      enum: ['Admin', 'Analyst', 'Viewer', 'Reader', 'Pending'],
      default: 'Pending',
    },
    approved: {
      type: Boolean,
      default: false,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const User = model<IUser>('User', UserSchema);
export default User;

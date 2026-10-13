import { Schema, model, Document } from 'mongoose';

export interface IAuditLog extends Document {
  action: 'Approve' | 'Reject' | 'ChangeRole' | 'Invite' | 'Block' | 'Delete';
  adminId: Schema.Types.ObjectId;
  targetUserId?: Schema.Types.ObjectId;
  assignedRole?: string;
  rejectionReason?: string;
  details?: string;
  ipAddress: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: true,
      enum: ['Approve', 'Reject', 'ChangeRole', 'Invite', 'Block', 'Delete'],
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedRole: {
      type: String,
      default: '',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    details: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);
export default AuditLog;

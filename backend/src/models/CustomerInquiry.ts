import { Schema, model, Document } from 'mongoose';

export interface ICustomerInquiry extends Document {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  product?: string;
  message: string;
  emailStatus: 'sent' | 'failed';
  emailError?: string;
  status: 'New' | 'In_Review' | 'Contacted' | 'Resolved';
  createdAt: Date;
  updatedAt: Date;
}

const CustomerInquirySchema = new Schema<ICustomerInquiry>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    company: {
      type: String,
      trim: true,
      default: '',
    },
    product: {
      type: String,
      trim: true,
      default: 'General',
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
    },
    emailStatus: {
      type: String,
      enum: ['sent', 'failed'],
      default: 'sent',
    },
    emailError: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['New', 'In_Review', 'Contacted', 'Resolved'],
      default: 'New',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const CustomerInquiry = model<ICustomerInquiry>('CustomerInquiry', CustomerInquirySchema);
export default CustomerInquiry;

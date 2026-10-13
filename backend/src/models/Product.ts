import { Schema, model, Document, Types } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  category: string;
  description?: string;
  price: number;
  currency: string;
  rating: number;
  reviewsCount: number;
  positivePercentage: number;
  negativePercentage: number;
  neutralPercentage: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
      default: 'General',
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    price: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 1.0,
      max: 5.0,
    },
    reviewsCount: {
      type: Number,
      default: 0,
    },
    positivePercentage: {
      type: Number,
      default: 100,
    },
    negativePercentage: {
      type: Number,
      default: 0,
    },
    neutralPercentage: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Product = model<IProduct>('Product', ProductSchema);
export default Product;
